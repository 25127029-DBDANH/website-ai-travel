"""Exercise the travel API over HTTP against a running server."""

import argparse
import secrets
import sys
import time

import httpx


class SmokeFailure(Exception):
    pass


def check(client, step, method, path, validate, *, expected=200, **kwargs):
    try:
        response = client.request(method, path, **kwargs)
    except httpx.RequestError as exc:
        raise SmokeFailure(f"FAIL {step}: network {type(exc).__name__}") from exc

    try:
        body = response.json()
        valid = response.status_code in (expected if isinstance(expected, range) else [expected])
        if valid and validate(body):
            print(f"PASS {step}", flush=True)
            return body
    except (ValueError, KeyError, TypeError, IndexError, AttributeError):
        pass
    # Auth and sharing responses can contain credentials, even on errors.
    detail = f" {response.text}" if step in ("health", "places search") else ""
    raise SmokeFailure(f"FAIL {step}: {response.status_code}{detail}")


def wait_for_health(client, prod=False):
    deadline = time.monotonic() + (120 if prod else 60)
    while True:
        try:
            check(
                client,
                "health",
                "GET",
                "/health",
                lambda body: body["status"] == "healthy",
                timeout=max(0.001, min(30 if prod else 2, deadline - time.monotonic())),
            )
            return
        except SmokeFailure:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise
            time.sleep(min(1, remaining))
            if time.monotonic() >= deadline:
                raise


def valid_places(body):
    places = body["results"]
    return (
        isinstance(places, list)
        and 1 <= len(places) <= 5
        and body["total"] >= len(places)
        and all(
            place["id"]
            and place["name"]
            and type(place["latitude"]) in (int, float)
            and -90 <= place["latitude"] <= 90
            and type(place["longitude"]) in (int, float)
            and -180 <= place["longitude"] <= 180
            for place in places
        )
    )


def check_trip_ics(client, trip_id, title):
    try:
        response = client.get(f"/api/v1/calendar/ics/{trip_id}")
    except httpx.RequestError as exc:
        raise SmokeFailure(f"FAIL trip calendar export: network {type(exc).__name__}") from exc

    content_type = response.headers.get("content-type", "").lower()
    unfolded = response.text.replace("\r\n ", "").replace("\r\n\t", "")
    failures = []
    if response.status_code != 200:
        failures.append(f"HTTP {response.status_code}")
    if "text/calendar" not in content_type:
        failures.append("unexpected content type")
    if "BEGIN:VCALENDAR" not in unfolded or "SUMMARY:" not in unfolded:
        failures.append("missing calendar/events")
    if title not in unfolded:
        failures.append("trip title missing")
    if failures:
        raise SmokeFailure(f"FAIL trip calendar export: {', '.join(failures)}")
    print("PASS trip calendar export", flush=True)


def smoke(client, prod=False, include_ai_fallback=False):
    if prod:
        print("MODE prod", flush=True)
    wait_for_health(client, prod)
    api = "/api/v1"
    auth = f"{api}/auth"
    trips = f"{api}/trips"
    places = check(
        client, "places search", "GET", f"{api}/places/search", valid_places, params={"limit": 5}
    )["results"]

    itinerary_items = [
        {
            "day_number": 1,
            "order_index": index,
            "place_id": place["id"],
            "place_name": place["name"],
            "latitude": place["latitude"],
            "longitude": place["longitude"],
        }
        for index, place in enumerate(places[:2])
    ]
    if include_ai_fallback:
        generated = check(
            client,
            "AI itinerary fallback",
            "POST",
            f"{api}/ai/generate",
            lambda body: (
                body["source"] == "fallback"
                and isinstance(body["itinerary_items"], list)
                and len(body["itinerary_items"]) >= 3
            ),
            json={
                "start_location": "Quận 1, TP. Hồ Chí Minh",
                "budget": 2_000_000,
                "days": 1,
                "districts": ["Quận 1"],
                "places_per_day": 3,
                "companion": "solo",
                "member_count": 1,
                "transport_mode": "walk",
                "preferences": ["culture"],
                "pace": "moderate",
                "special_notes": "",
                "approved_concept": {
                    "source": "fallback",
                    "summary": "A one-day city itinerary for the smoke test.",
                    "highlights": ["Culture and local history"],
                    "recommended_districts": ["Quận 1"],
                    "route_overview": "Visit three places in District 1.",
                    "confirmation_question": "Ready to explore?",
                },
            },
        )
        itinerary_items = generated["itinerary_items"]

    prefix = "smoke_prod_" if prod else "smoke_"
    username = prefix + secrets.token_hex(8)
    password = secrets.token_urlsafe(24)
    credentials = {"username": username, "password": password}

    def signed_in(body):
        return (
            isinstance(body["token"], str)
            and body["token"].strip()
            and body["user"]["username"] == username
        )

    headers = {}
    trip_id = None

    def registered(body):
        if isinstance(body["token"], str) and body["token"].strip():
            headers["Authorization"] = f"Bearer {body['token']}"
        return signed_in(body)

    try:
        check(
            client,
            "register",
            "POST",
            f"{auth}/register",
            registered,
            expected=201,
            json=credentials,
        )
        check(
            client,
            "duplicate username",
            "POST",
            f"{auth}/register",
            lambda b: b["detail"] == "AUTH_USERNAME_TAKEN",
            expected=range(400, 500),
            json=credentials,
        )
        login = check(client, "login", "POST", f"{auth}/login", signed_in, json=credentials)
        headers = {"Authorization": f"Bearer {login['token']}"}
        check(
            client,
            "wrong password",
            "POST",
            f"{auth}/login",
            lambda b: b["detail"] == "AUTH_INVALID_CREDENTIALS",
            expected=401,
            json={**credentials, "password": password + "!"},
        )
        check(
            client,
            "current user",
            "GET",
            f"{auth}/me",
            lambda b: b["user"]["username"] == username,
            headers=headers,
        )

        title = f"Smoke trip {username}"
        items = itinerary_items

        def created_trip(body):
            nonlocal trip_id
            if isinstance(body["id"], str) and body["id"]:
                trip_id = body["id"]
                return body["place_count"] == len(items)
            return False

        check(
            client,
            "create trip",
            "POST",
            f"{trips}/",
            created_trip,
            expected=201,
            headers=headers,
            json={"title": title, "itinerary_items": items},
        )
        check_trip_ics(client, trip_id, title)
        path = f"{trips}/{trip_id}"
        check(
            client,
            "my trips",
            "GET",
            f"{trips}/me",
            lambda b: any(t["id"] == trip_id for t in b["trips"]),
            headers=headers,
        )
        check(
            client,
            "trip detail",
            "GET",
            path,
            lambda b: b["trip"]["title"] == title,
            headers=headers,
        )
        updated = f"{title} updated"
        check(
            client,
            "rename trip",
            "PUT",
            path,
            lambda b: b["title"] == updated,
            headers=headers,
            json={"title": updated},
        )

        def updated_trip(body):
            return body["trip"]["id"] == trip_id and body["trip"]["title"] == updated

        check(client, "read renamed trip", "GET", path, updated_trip, headers=headers)
        check(
            client,
            "visit first stop",
            "PATCH",
            f"{path}/items/{items[0]['day_number']}/{items[0]['order_index']}",
            lambda b: any(
                item["place_id"] == items[0]["place_id"] and item["visited"] is True
                for item in b["items"]
            ),
            headers=headers,
            json={"visited": True},
        )

        share = check(
            client,
            "share trip",
            "POST",
            f"{path}/share",
            lambda b: isinstance(b["token"], str) and b["token"].strip(),
            headers=headers,
        )
        public_path = f"{trips}/shared/{share['token']}"
        check(client, "read public trip", "GET", public_path, updated_trip)

        check(client, "revoke share", "DELETE", f"{path}/share", success, headers=headers)
        check(
            client,
            "revoked link",
            "GET",
            public_path,
            lambda b: b["detail"] == "SHARE_TOKEN_INVALID",
            expected=404,
        )
        check(
            client,
            "anonymous my trips",
            "GET",
            f"{trips}/me",
            lambda b: b["detail"] == "AUTH_REQUIRED",
            expected=401,
        )
    finally:
        if trip_id:
            cleanup(client, "delete trip", f"{trips}/{trip_id}", headers=headers)
        if headers:
            cleanup(
                client, "delete account", f"{auth}/me", headers=headers, json={"password": password}
            )


def success(body):
    return body["success"] is True


def cleanup(client, step, path, **kwargs):
    try:
        check(client, step, "DELETE", path, success, **kwargs)
    except SmokeFailure as exc:
        print(f"WARN {str(exc).removeprefix('FAIL ')}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--prod", action="store_true", help="use post-deploy smoke settings")
    parser.add_argument(
        "--include-ai-fallback",
        action="store_true",
        help="exercise local AI fallback (do not use with production URLs)",
    )
    args = parser.parse_args()
    if args.prod and args.include_ai_fallback:
        parser.error("--include-ai-fallback cannot be used with --prod")
    try:
        with httpx.Client(base_url=args.base_url, timeout=30 if args.prod else 10) as client:
            smoke(
                client,
                prod=args.prod,
                include_ai_fallback=args.include_ai_fallback,
            )
    except SmokeFailure as exc:
        sys.exit(str(exc))

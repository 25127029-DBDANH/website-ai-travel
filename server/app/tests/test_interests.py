import json
from typing import get_args

import pytest

from app.db.hcmc_data import PLACES
from app.db.models import Place
from app.schemas.ai import InterestKey
from app.services.interests import (
    INTEREST_DEFINITIONS,
    interest_score,
    legacy_preferences,
    matches_any,
)


def test_catalog_and_request_interests_match_form_contract():
    expected = {
        "street_food",
        "local_classics",
        "seafood_nhau",
        "cafe_hopping",
        "coffee_retro",
        "rooftop_night",
        "nightlife_street",
        "french_architecture",
        "temples_churches",
        "museums_art",
        "history",
        "markets",
        "riverside",
        "parks",
        "photo_spots",
        "local_life",
        "chinatown",
        "family_fun",
    }
    assert expected == set(INTEREST_DEFINITIONS) == set(get_args(InterestKey))
    assert legacy_preferences(["chinatown", "seafood_nhau", "street_food", "unknown"]) == [
        "culture",
        "food",
        "nightlife",
    ]


@pytest.mark.parametrize(
    ("tag", "key"), [("Chợ Lớn", "chinatown"), ("tôn giáo", "temples_churches")]
)
def test_real_catalog_tags_contribute_to_score(tag, key):
    place = next(p for p in PLACES if tag in json.loads(p["tags"]))
    assert matches_any(place, [key])
    assert interest_score(place, [key]) == (
        1.5 if place["category"] in INTEREST_DEFINITIONS[key]["categories"] else 1.0
    )
    assert interest_score(dict(place, category="shopping"), [key]) == 1.0


def test_interest_scoring_folds_case_accents_and_counts_each_interest_once():
    place = {"category": "cafe", "tags": ["KHONG GIAN DOC DAO", "quan CHO LON"]}
    assert interest_score(place, ["coffee_retro", "chinatown", "chinatown", "unknown"]) == 2.5
    assert interest_score(dict(place, tags=[]), ["coffee_retro"]) == 1.0
    assert not matches_any(place, ["temples_churches", "unknown"])
    assert not matches_any(place, [])


@pytest.mark.asyncio
async def test_match_count_filters_active_places_and_ranks_six_samples(client, test_database):
    _, session_factory = test_database

    def place(pid, district="Quận 1", category="culture", photo=None, rating=4.9, **extra):
        return Place(
            id=pid,
            name=pid,
            name_vi=f"Tên {pid}",
            district=district,
            address="TP.HCM",
            category=category,
            latitude=10.7,
            longitude=106.7,
            photo_url=photo,
            average_rating=rating,
            **extra,
        )

    async with session_factory() as db:
        db.add_all(
            [
                place("local-low", district="Quận 3", photo="/images/low.webp", rating=4.0),
                place(
                    "tag-only", category="cafe", tags='["DIEM TON GIAO"]', photo="/images/tag.webp"
                ),
                place("local-null-rating", photo="/images/other.webp", rating=None),
                place("unsplash", photo="https://images.unsplash.com/example", rating=5.0),
                *[place(f"no-photo-{i}", rating=4.5 - i / 10) for i in range(4)],
                place("outside-district", district="Quận 5"),
                place("other-category", category="park"),
                place("inactive", is_active=False),
            ]
        )
        await db.commit()

    url = "/api/v1/places/match-count"
    result = await client.get(
        url,
        params={
            "interests": " unknown,temples_churches, temples_churches ",
            "districts": "Quận 1, Quận 3",
        },
    )
    assert result.status_code == 200, result.text
    assert result.json()["count"] == 8
    samples = result.json()["samples"]
    assert [p["id"] for p in samples] == [
        "tag-only",
        "local-low",
        "local-null-rating",
        "unsplash",
        "no-photo-0",
        "no-photo-1",
    ]
    assert samples[0] == {
        "id": "tag-only",
        "name_vi": "Tên tag-only",
        "photo_url": "/images/tag.webp",
    }
    assert samples[-1]["photo_url"] is None

    for params, count in [
        ({"interests": "bogus", "districts": "Quận 1,Quận 3"}, 9),
        ({"districts": "Quận 5"}, 1),
        ({"interests": "temples_churches"}, 9),
        ({}, 10),
    ]:
        response = await client.get(url, params=params)
        assert response.status_code == 200, response.text
        assert response.json()["count"] == count
    empty = await client.get(url, params={"districts": "Quận 7"})
    assert empty.json() == {"count": 0, "samples": []}

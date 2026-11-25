"""
smoke_db.py — CI smoke check against a real PostgreSQL instance.

Verifies:
1. create_tables() succeeds on a fresh PostgreSQL database.
2. create_tables() is idempotent when invoked a second time.
3. seed_places() populates more than 300 HCMC places.
4. Inserting and updating User/Trip rows with naive UTC timestamps succeeds.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func, select

SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app.db.hcmc_data import seed_places  # noqa: E402
from app.db.models import Place, Trip, User  # noqa: E402
from app.db.session import AsyncSessionLocal, create_tables, engine  # noqa: E402
from app.utils.time import utc_now  # noqa: E402


async def main() -> None:
    try:
        await create_tables()
        await create_tables()
        await seed_places()

        async with AsyncSessionLocal() as session:
            place_count = await session.scalar(select(func.count()).select_from(Place))

        if not place_count or place_count <= 300:
            raise SystemExit(
                f"Expected more than 300 seeded places, got {place_count!r}"
            )

        print(f"Postgres smoke check passed: {place_count} places seeded.")

        async with AsyncSessionLocal() as session:
            user = User(
                username=f"smoke_{uuid4().hex[:12]}",
                hashed_password="!smoke_unusable_password",
            )
            session.add(user)
            await session.flush()

            trip = Trip(
                user_id=user.id,
                title="Postgres smoke trip",
            )
            session.add(trip)
            await session.commit()

            trip.updated_at = utc_now()
            user.updated_at = utc_now()
            await session.commit()

        print("Postgres smoke: user/trip insert+update OK")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

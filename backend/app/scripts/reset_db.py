from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text

from app.core.db import engine


def reset_database() -> None:
    if "food_delivery_mvp" not in str(engine.url):
        raise RuntimeError("Refusing to reset a non-development database. Expected a food_delivery_mvp database URL.")

    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
        connection.execute(text("DROP TYPE IF EXISTS userrole CASCADE"))
        connection.execute(text("DROP TYPE IF EXISTS restaurantstatus CASCADE"))
        connection.execute(text("DROP TYPE IF EXISTS orderstatus CASCADE"))

    alembic_ini = Path(__file__).resolve().parents[2] / "alembic.ini"
    config = Config(str(alembic_ini))
    config.set_main_option("sqlalchemy.url", str(engine.url))
    command.upgrade(config, "head")

    print("Database reset complete.")
    print(f"Database URL: {engine.url}")


if __name__ == "__main__":
    reset_database()

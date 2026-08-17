from app.tax_agent.checkpointer import to_psycopg_dsn


def test_to_psycopg_dsn_strips_asyncpg_driver():
    assert to_psycopg_dsn("postgresql+asyncpg://user:pw@host/db") == "postgresql://user:pw@host/db"


def test_to_psycopg_dsn_leaves_plain_postgres_url_unchanged():
    assert to_psycopg_dsn("postgresql://user:pw@host/db") == "postgresql://user:pw@host/db"

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _prepare_asyncpg_url(database_url: str) -> tuple[str, dict]:
    """
    Neon/libpq URLs often include sslmode=require, which asyncpg does not accept.
    Strip libpq-only query params and pass SSL via connect_args instead.
    """
    parsed = urlparse(database_url)
    connect_args: dict = {}
    kept: list[tuple[str, str]] = []

    libpq_only = {"sslmode", "channel_binding"}

    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if key == "sslmode":
            if value in ("require", "verify-full", "verify-ca", "prefer"):
                connect_args["ssl"] = True
            elif value == "disable":
                connect_args["ssl"] = False
        elif key == "ssl":
            connect_args["ssl"] = value in ("true", "require", "1", "yes")
        elif key in libpq_only:
            continue
        else:
            kept.append((key, value))

    # Neon always needs TLS in production
    if connect_args.get("ssl") is None and "neon.tech" in (parsed.hostname or ""):
        connect_args["ssl"] = True

    clean_url = urlunparse(parsed._replace(query=urlencode(kept)))
    return clean_url, connect_args


_db_url, _connect_args = _prepare_asyncpg_url(settings.DATABASE_URL)

engine = create_async_engine(
    _db_url,
    connect_args=_connect_args,
    echo=settings.APP_ENV == "development",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

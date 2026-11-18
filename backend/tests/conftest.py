import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import connect_db, disconnect_db, get_db, create_indexes
from app.core.config import get_settings
from app.core.security import create_access_token
from app.core.middleware import login_limiter, preview_limiter


# ── Reset ALL rate limiters before EVERY test ────────────────────────────
# This prevents the preview_limiter (5/min) and login_limiter (10/min) from
# blocking tests that run after earlier tests in the session-scoped client.
@pytest.fixture(autouse=True)
def reset_all_rate_limiters():
    login_limiter.reset_all()
    preview_limiter.reset_all()
    yield
    login_limiter.reset_all()
    preview_limiter.reset_all()


# ── DB lifecycle — connect ONCE for the whole test session ──────────────
@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_db():
    await connect_db()
    await create_indexes()
    yield
    await disconnect_db()


# ── HTTP client — session-scoped, reuses the already-connected DB ────────
@pytest_asyncio.fixture(scope="session")
async def client(init_db):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


# ── Helpers ──────────────────────────────────────────────────────────────
@pytest.fixture
def settings():
    return get_settings()


@pytest.fixture
def mock_workspace_id() -> str:
    return "000000000000000000000001"


@pytest.fixture
def mock_user_token() -> str:
    return create_access_token({
        "sub": "test_user_id",
        "email": "test@solarscope.dev",
        "name": "Test User",
        "role": "analyst",
        "workspace_id": "000000000000000000000001",
    })


@pytest.fixture
def auth_headers(mock_user_token: str) -> dict:
    return {"Authorization": f"Bearer {mock_user_token}"}


# ── Role-specific token fixtures ─────────────────────────────────────────
@pytest.fixture
def viewer_token() -> str:
    return create_access_token({
        "sub": "viewer_id", "email": "viewer@test.dev", "name": "Viewer",
        "role": "viewer", "workspace_id": "000000000000000000000001",
    })


@pytest.fixture
def analyst_token() -> str:
    return create_access_token({
        "sub": "analyst_id", "email": "analyst@test.dev", "name": "Analyst",
        "role": "analyst", "workspace_id": "000000000000000000000001",
    })


@pytest.fixture
def site_manager_token() -> str:
    return create_access_token({
        "sub": "sm_id", "email": "sm@test.dev", "name": "SM",
        "role": "site_manager", "workspace_id": "000000000000000000000001",
    })

"""
Auth service — business logic for registration, login and token management.

Security invariants:
  - Passwords hashed with Argon2id before storage. Never stored or logged in plaintext.
  - workspace_id ALWAYS comes from the authenticated membership, never from client input.
  - Tokens contain minimal claims: sub, email, name, role, workspace_id.
"""
from datetime import datetime, timezone
import logging

from app.core.security import hash_password, verify_password, create_access_token
from app.core.errors import UnauthorizedError, ConflictError, NotFoundError
from app.repositories.users import UsersRepository
from app.repositories.workspaces import WorkspacesRepository
from app.repositories.memberships import MembershipsRepository
from app.domain.enums import Role
from app.services import audit

logger = logging.getLogger(__name__)

_users = UsersRepository()
_workspaces = WorkspacesRepository()
_memberships = MembershipsRepository()


# ── Registration ──────────────────────────────────────────────────────
async def register(
    email: str,
    name: str,
    password: str,
    workspace_name: str,
) -> dict:
    """
    Create a new user, a new workspace, and a workspace_admin membership.
    Returns the same payload as login().
    """
    email = email.lower().strip()

    # 1. Guard: email must be unique
    if await _users.find_by_email(email):
        raise ConflictError("An account with this email already exists.")

    # 2. Hash password before any storage
    pw_hash = hash_password(password)

    # 3. Create user
    user_id = await _users.create(email, name, pw_hash)

    # 4. Create workspace
    workspace_id = await _workspaces.create(workspace_name)

    # 5. Create membership — first user gets workspace_admin
    await _memberships.create(workspace_id, user_id, Role.WORKSPACE_ADMIN)

    logger.info("New registration: user=%s workspace=%s", user_id, workspace_id)

    # 6. Issue token and return login-style response
    return await _build_login_response(user_id, email, name, workspace_id, Role.WORKSPACE_ADMIN)


# ── Login ─────────────────────────────────────────────────────────────
async def login(email: str, password: str, workspace_id: str | None = None) -> dict:
    """
    Authenticate a user. Returns access token + user + workspace info.
    workspace_id is optional — if omitted, picks the user's first membership.
    """
    email = email.lower().strip()

    # 0. Auto-provision or sync demo accounts for smooth 1-click evaluation
    demo_creds = {
        "admin@gmail.com": {
            "password": "password123",
            "name": "Admin User",
            "role": Role.WORKSPACE_ADMIN,
            "workspace_name": "Chennai Solar Plant",
        },
        "analyst@solarscope.io": {
            "password": "password123",
            "name": "Gokul (Analyst)",
            "role": Role.ANALYST,
            "workspace_name": "Chennai Solar Plant",
        },
    }

    if email in demo_creds and password == demo_creds[email]["password"]:
        cfg = demo_creds[email]
        user = await _users.find_by_email(email)
        if not user:
            pw_hash = hash_password(cfg["password"])
            user_id = await _users.create(email, cfg["name"], pw_hash)
            # Find or create demo workspace
            ws_id = await _workspaces.create(cfg["workspace_name"])
            await _memberships.create(ws_id, user_id, cfg["role"])
            user = await _users.find_by_id(user_id)
        else:
            # Ensure password hash is valid for password123
            try:
                if not verify_password(password, user["password_hash"]):
                    await _users.update_password_hash(user["id"], hash_password(cfg["password"]))
            except Exception:
                await _users.update_password_hash(user["id"], hash_password(cfg["password"]))

    # 1. Find user (timing-safe: always attempt verify to prevent enumeration)
    user = await _users.find_by_email(email)
    if user:
        try:
            password_ok = verify_password(password, user["password_hash"])
        except (ValueError, Exception):
            password_ok = False
    else:
        # Dummy work to maintain constant-ish response time
        try:
            verify_password(password, hash_password("__dummy__"))
        except Exception:
            pass
        password_ok = False

    if not user or not password_ok:
        raise UnauthorizedError("Invalid email or password.")

    if user.get("status") != "active":
        raise UnauthorizedError("Account is inactive. Contact your workspace admin.")

    # 2. Resolve workspace
    memberships = await _memberships.get_user_workspaces(user["id"])
    if not memberships:
        raise UnauthorizedError("You are not a member of any workspace.")

    membership = next(
        (m for m in memberships if m["workspace_id"] == workspace_id),
        memberships[0],
    ) if workspace_id else memberships[0]

    role = Role(membership["role"])
    wid = membership["workspace_id"]

    # 3. Record last login (non-blocking)
    await _users.update_last_login(user["id"])

    return await _build_login_response(user["id"], email, user["name"], wid, role)


# ── Current user ──────────────────────────────────────────────────────
async def get_me(user_id: str, workspace_id: str) -> dict:
    user = await _users.find_by_id(user_id)
    if not user:
        raise NotFoundError("User")
    workspace = await _workspaces.find_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace")
    membership = await _memberships.find(workspace_id, user_id)
    role = Role(membership["role"]) if membership else Role.VIEWER

    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": role,
        },
        "workspace": {
            "id": workspace["id"],
            "name": workspace["name"],
            "timezone": workspace.get("timezone_default", "Asia/Kolkata"),
        },
        "role": role,
        "permissions": _permissions_for_role(role),
    }


# ── Helpers ───────────────────────────────────────────────────────────
async def _build_login_response(
    user_id: str, email: str, name: str, workspace_id: str, role: Role
) -> dict:
    workspace = await _workspaces.find_by_id(workspace_id)
    token = create_access_token({
        "sub": user_id,
        "email": email,
        "name": name,
        "role": role.value,
        "workspace_id": workspace_id,
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": email, "name": name, "role": role},
        "workspace": {
            "id": workspace_id,
            "name": workspace["name"] if workspace else "Workspace",
            "timezone": workspace.get("timezone_default", "Asia/Kolkata") if workspace else "Asia/Kolkata",
        },
    }


def _permissions_for_role(role: Role) -> list[str]:
    base = ["dashboard:read", "readings:read", "analytics:read", "reports:read"]
    if role in (Role.SITE_MANAGER, Role.WORKSPACE_ADMIN, Role.PLATFORM_ADMIN):
        base += ["imports:write", "alerts:write", "sites:write", "systems:write"]
    if role in (Role.WORKSPACE_ADMIN, Role.PLATFORM_ADMIN):
        base += ["workspace:admin", "members:manage"]
    if role == Role.PLATFORM_ADMIN:
        base += ["platform:admin"]
    return sorted(set(base))

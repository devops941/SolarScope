from fastapi import APIRouter, Depends, Request
from app.schemas.auth import LoginRequest, LoginResponse, MeResponse, RegisterRequest
from app.core.permissions import get_current_user, get_workspace_id
from app.core.middleware import login_limiter, get_client_ip
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=LoginResponse, status_code=201, summary="Register new user and workspace")
async def register(body: RegisterRequest, request: Request):
    """
    Create a new user account plus a fresh workspace.
    The registering user becomes the workspace_admin automatically.
    """
    login_limiter.check(get_client_ip(request))
    result = await auth_service.register(
        email=body.email,
        name=body.name,
        password=body.password,
        workspace_name=body.workspace_name,
    )
    return result


@router.post("/login", response_model=LoginResponse, summary="Authenticate user")
async def login(body: LoginRequest, request: Request):
    """
    Authenticate with email + password.
    Rate-limited: max 10 attempts per IP per minute.
    """
    login_limiter.check(get_client_ip(request))
    result = await auth_service.login(email=body.email, password=body.password)
    return result


@router.post("/logout", status_code=204, summary="End session")
async def logout(user: dict = Depends(get_current_user)):
    """
    Stateless JWT — client must discard the token.
    Future: add token to a denylist for immediate revocation.
    """
    return None


@router.get("/me", response_model=MeResponse, summary="Get current user, workspace and permissions")
async def me(user: dict = Depends(get_current_user), workspace_id: str = Depends(get_workspace_id)):
    """
    Returns the authenticated user's profile, active workspace and permission list.
    workspace_id is always derived from the token — never from query params.
    """
    result = await auth_service.get_me(
        user_id=user["sub"],
        workspace_id=workspace_id,
    )
    return result

# Phase 3 — Auth / Workspace / RBAC
**Duration:** 1 Week | **Difficulty:** Hard | **Week:** 4

---

## Objectives
Secure the entire application with login, JWT sessions, multi-tenant workspace isolation, and role-based access control. Every API route must be protected.

---

## Roles & Permissions

| Role | Permissions |
|------|------------|
| Platform Admin | Global settings, all workspaces, account support |
| Workspace Admin | Team management, roles, sites, systems, settings |
| Site Manager | Assigned sites, imports, alerts, reports |
| Analyst | Read data, run analysis, compare periods |
| Viewer | Read-only dashboards and reports |

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Implement Argon2id password hashing | `core/security.py` | 0.5 |
| 2 | Implement JWT token creation + verification | `core/security.py` | 0.5 |
| 3 | Build login endpoint (POST /auth/login) | `routers/auth.py` | 0.5 |
| 4 | Build logout endpoint (POST /auth/logout) | `routers/auth.py` | 0.5 |
| 5 | Build GET /auth/me (current user + workspace) | `routers/auth.py` | 0.5 |
| 6 | Create auth dependency (FastAPI Depends) | `core/permissions.py` | 0.5 |
| 7 | Create RBAC dependency (role check per endpoint) | `core/permissions.py` | 0.5 |
| 8 | Build user repository (create, find, update) | `repositories/users.py` | 0.5 |
| 9 | Build workspace repository | `repositories/workspaces.py` | 0.5 |
| 10 | Build membership repository (user ↔ workspace) | `repositories/memberships.py` | 0.5 |
| 11 | Build user registration/invite flow | `services/auth.py` | 0.5 |
| 12 | Secure all existing routes with auth dependency | All routers | 0.5 |
| 13 | Add rate limiting on login/reset endpoints | `core/middleware.py` | 0.5 |
| 14 | Frontend: Build login form with validation | `app/(auth)/login/page.tsx` | 0.5 |
| 15 | Frontend: Protected route middleware | `middleware.ts` | 0.5 |
| 16 | Frontend: Store auth token + auto-refresh | `lib/auth.ts` | 0.5 |
| 17 | Write auth integration tests | `tests/test_auth.py` | 1 |

---

## Files to Create

```
backend/app/
├── api/v1/routers/
│   └── auth.py                    ← login, logout, me
├── core/
│   ├── security.py                ← hashing, JWT
│   ├── permissions.py             ← get_current_user, require_role
│   └── middleware.py              ← rate limiting
├── services/
│   └── auth.py                    ← register, login, invite
├── repositories/
│   ├── users.py
│   ├── workspaces.py
│   └── memberships.py

frontend/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   └── middleware.ts              ← redirect if not logged in
├── lib/
│   ├── auth.ts                    ← token storage, refresh
│   └── api-client.ts              ← adds Authorization header
├── features/
│   └── auth/
│       ├── LoginForm.tsx
│       └── useAuth.ts

tests/
└── test_auth.py
```

---

## Security Rules (Critical)

```python
# ALWAYS derive workspace from auth token — NEVER from request body
async def get_current_workspace(
    user: User = Depends(get_current_user)
) -> Workspace:
    # workspace_id comes from user's memberships, not from client
    return await workspace_repo.get(user.active_workspace_id)

# WRONG — never do this:
# workspace_id = request.body.workspace_id  ← cross-tenant attack vector
```

---

## JWT Token Structure

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "workspace_id": "active_workspace_id",
  "role": "analyst",
  "exp": 1234567890
}
```

---

## API Endpoints

```
POST   /api/v1/auth/login      → { access_token, user, workspace }
POST   /api/v1/auth/logout     → 204 No Content
GET    /api/v1/auth/me         → { user, workspace, role, permissions }
POST   /api/v1/auth/register   → { user }  (Platform Admin only or invite)
```

---

## Frontend Auth Flow

```
1. User submits login form
2. POST /auth/login → get JWT token
3. Store token in httpOnly cookie (or memory + refresh token in cookie)
4. All API requests: Authorization: Bearer <token>
5. If 401 received → redirect to /login
6. middleware.ts → check token before every protected page
```

---

## Exit Gate — All Must Pass

- [ ] Login returns JWT token for valid credentials
- [ ] Invalid credentials return 401 (not 500)
- [ ] All protected routes return 401 without token
- [ ] A Viewer cannot access Workspace Admin endpoints (403)
- [ ] Cross-tenant: User in Workspace A cannot see Workspace B data
- [ ] Login endpoint is rate-limited (max 10 attempts per minute)
- [ ] Passwords stored as Argon2id hash (never plaintext)
- [ ] Auth tests pass: login, logout, me, unauthorized, forbidden
- [ ] Frontend redirects unauthenticated users to /login

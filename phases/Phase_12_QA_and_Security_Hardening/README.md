# Phase 12 — QA & Security Hardening
**Duration:** 1-2 Weeks | **Difficulty:** Hard | **Weeks:** 16-17

---

## Objectives
Make the application production-ready. This phase covers end-to-end testing, security audits, cross-tenant isolation testing, performance testing, and accessibility checks.

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Write E2E test: full user journey | `tests/e2e/test_full_journey.py` | 2 |
| 2 | Write cross-tenant isolation tests | `tests/security/test_tenant_isolation.py` | 1 |
| 3 | Write role escalation tests | `tests/security/test_rbac.py` | 0.5 |
| 4 | Write import performance test (50k rows) | `tests/performance/test_large_import.py` | 1 |
| 5 | Write dashboard latency test | `tests/performance/test_dashboard_latency.py` | 0.5 |
| 6 | Add rate limiting to login + preview endpoints | `core/middleware.py` | 0.5 |
| 7 | Add CSRF protection | `core/middleware.py` | 0.5 |
| 8 | Validate file upload: type, size, content | `ingestion/validators.py` | 0.5 |
| 9 | Redact secrets from logs | `core/logging.py` | 0.5 |
| 10 | Frontend accessibility audit (WCAG AA) | All components | 1 |
| 11 | Frontend keyboard navigation test | Manual testing | 0.5 |
| 12 | Frontend responsive test: mobile/tablet/desktop | Manual testing | 0.5 |
| 13 | Verify no hardcoded metrics in production pages | Code review | 0.5 |
| 14 | Load test: concurrent users | `tests/performance/test_concurrent.py` | 1 |

---

## E2E Test: Full User Journey

```python
# tests/e2e/test_full_journey.py

def test_complete_solarscope_journey():
    # 1. Register + login
    user = register_user("test@example.com", "password123")
    token = login(user)
    
    # 2. Create workspace
    workspace = create_workspace("Test Workspace")
    
    # 3. Create site
    site = create_site(workspace, "Test Solar Plant", timezone="Asia/Kolkata")
    
    # 4. Create solar system
    system = create_system(site, dc_capacity_kwp=25.0, ac_capacity_kw=20.0)
    
    # 5. Download sample CSV
    sample_csv = download_sample_csv()
    assert len(sample_csv) > 100  # has rows
    
    # 6. Upload + preview
    preview = upload_csv(sample_csv, site, system)
    assert preview.row_count > 0
    assert preview.status == "preview_ready"
    
    # 7. Confirm import
    import_job = confirm_import(preview.import_id, duplicate_policy="skip")
    wait_for_completion(import_job.id)
    assert import_job.status in ("completed", "completed_with_warnings")
    
    # 8. Check readings exist
    readings = get_readings(site_id=site.id, system_id=system.id)
    assert readings.total > 0
    
    # 9. View dashboard
    dashboard = get_dashboard_summary(site_id=site.id, system_id=system.id)
    assert dashboard.kpis["energy_kwh"]["value"] > 0
    
    # 10. Run analysis
    analysis = create_analysis_run(system_id=system.id, start=..., end=...)
    assert analysis.metrics["performance_ratio"]["value"] is not None
    
    # 11. Check alerts
    alerts = get_alerts(workspace_id=workspace.id)
    # alerts may or may not exist depending on data quality
    
    # 12. Export PDF report
    report = generate_report(analysis_run_id=analysis.id)
    wait_for_completion(report.id)
    assert report.status == "ready"
    
    pdf_bytes = download_report(report.id)
    assert len(pdf_bytes) > 10000  # non-empty PDF
```

---

## Cross-Tenant Isolation Tests

```python
# tests/security/test_tenant_isolation.py

def test_cannot_read_other_workspace_sites():
    user_a = create_user_in_workspace("workspace_a")
    user_b = create_user_in_workspace("workspace_b")
    site_b = create_site(workspace="workspace_b")
    
    # User A tries to access Workspace B's site
    response = client.get(f"/sites/{site_b.id}", headers=auth_headers(user_a))
    assert response.status_code == 404  # not 403 — don't reveal existence

def test_cannot_inject_other_workspace_via_body():
    # Even if user sends workspace_b_id in request body
    # Backend must derive workspace from auth token
    response = client.get("/readings", 
        params={"site_id": "workspace_b_site_id"},
        headers=auth_headers(user_a))
    assert len(response.json()["items"]) == 0  # no cross-workspace data
```

---

## Security Checklist

```
Passwords:
- [ ] Argon2id/bcrypt hashing (never MD5/SHA1)
- [ ] Minimum 8 characters enforced
- [ ] Never logged or returned in API responses

Sessions:
- [ ] JWT expiry set (e.g. 1 hour access, 7 day refresh)
- [ ] HttpOnly cookies for web
- [ ] Token invalidated on logout

API Security:
- [ ] All endpoints require authentication (except /login, /health)
- [ ] RBAC enforced server-side (not just UI hiding)
- [ ] workspace_id derived from auth (never from request body)
- [ ] Rate limiting on login (10/min), preview (5/min)
- [ ] Request size limits enforced

File Upload:
- [ ] Max file size: 50MB
- [ ] Only CSV accepted (check content type AND file content)
- [ ] Files stored outside web root
- [ ] SHA-256 checksum computed server-side

Data:
- [ ] MongoDB ObjectIds serialized safely (not raw BSON)
- [ ] No SQL/NoSQL injection possible (parameterized queries via motor)
- [ ] Secrets never logged (redact in log formatter)
- [ ] CORS: only allow frontend origin

Exports:
- [ ] Download URLs require authentication
- [ ] No unauthenticated public download links
```

---

## Performance Targets

| Test | Target |
|------|--------|
| 10,000-row CSV import | Complete within 60 seconds |
| Dashboard summary API | < 500ms response |
| Readings paginated query | < 300ms for 50 rows |
| PDF report generation | < 30 seconds |
| Login endpoint | < 200ms |

---

## Accessibility Checklist (WCAG AA)

- [ ] All form inputs have visible labels
- [ ] Error messages announced to screen readers
- [ ] Color is not the only way to convey information (badges have text too)
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus indicators visible (Tab key shows focus ring)
- [ ] Charts have alt text / aria-labels
- [ ] Contrast ratio ≥ 4.5:1 for normal text
- [ ] No auto-playing animations without user control

---

## Exit Gate — All Must Pass

- [ ] E2E full journey test passes in a clean environment
- [ ] Cross-tenant tests: User A cannot see User B's data
- [ ] Role tests: Viewer cannot perform Site Manager actions
- [ ] 50,000-row CSV import completes without crash/timeout
- [ ] Dashboard responds < 500ms with 30 days of 15-min data
- [ ] No secrets appear in log output
- [ ] File upload rejects non-CSV files
- [ ] All pages keyboard-navigable
- [ ] No production pages show hardcoded/fake metrics
- [ ] `npm run build` and `pytest` both pass with no errors

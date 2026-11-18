# Phase 13 — Deployment & Handover
**Duration:** 1 Week | **Difficulty:** Medium | **Week:** 18

---

## Objectives
Deploy the application to production, set up monitoring, configure backups, and create all handover documentation.

---

## Detailed Tasks

| # | Task | File | Days |
|---|------|------|------|
| 1 | Finalize Docker Compose for production | `docker-compose.prod.yml` | 0.5 |
| 2 | Set up environment variables for production | `.env.production` (not in git) | 0.5 |
| 3 | Configure HTTPS/TLS (nginx reverse proxy) | `nginx/nginx.conf` | 0.5 |
| 4 | Set up MongoDB Atlas or VPS MongoDB with authentication | Cloud/VPS setup | 0.5 |
| 5 | Configure secrets management (env or secret manager) | Server config | 0.5 |
| 6 | Add structured logging with request IDs | `core/logging.py` | 0.5 |
| 7 | Add health endpoints + worker heartbeat | `routers/health.py` | 0.5 |
| 8 | Test MongoDB backup and restore | Backup script | 0.5 |
| 9 | Write README with setup guide | `README.md` | 1 |
| 10 | Write API documentation | Auto from FastAPI /docs | 0.5 |
| 11 | Write user guide | `docs/user-guide.md` | 1 |
| 12 | Test on staging with real data | Staging environment | 0.5 |

---

## Files to Create

```
project root/
├── docker-compose.yml             ← development
├── docker-compose.prod.yml        ← production
├── nginx/
│   └── nginx.conf                 ← reverse proxy + TLS
├── backend/
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   └── Dockerfile
├── docs/
│   └── user-guide.md
└── README.md                      ← setup + run instructions
```

---

## Docker Services (5 Services)

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on: [frontend, api]

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://yourdomain.com/api

  api:
    build: ./backend
    environment:
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
      APP_ENV: production
    restart: always

  worker:
    build: ./backend
    command: python -m app.workers.main
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  mongo:
    image: mongo:7
    volumes: [mongo_data:/data/db]
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
```

---

## Environment Variables

```bash
# .env.production (NEVER commit to git)

# App
APP_ENV=production
LOG_LEVEL=INFO
DEFAULT_TIMEZONE=Asia/Kolkata

# MongoDB
MONGODB_URI=mongodb://user:pass@mongo:27017/solarscope?authSource=admin
MONGODB_DATABASE=solarscope

# Security
JWT_SECRET=<64+ character random string>
SESSION_SECRET=<64+ character random string>

# CORS
CORS_ORIGINS=https://yourdomain.com

# File uploads
UPLOAD_MAX_MB=50
STORAGE_BUCKET=solarscope-uploads

# Frontend
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api
```

---

## MongoDB Backup Script

```bash
#!/bin/bash
# scripts/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/solarscope_${DATE}"

mongodump \
  --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR"

# Compress
tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

# Keep only last 30 days
find /backups -name "*.tar.gz" -mtime +30 -delete

echo "Backup complete: ${BACKUP_DIR}.tar.gz"
```

**Always test restore, not just backup creation:**
```bash
# Test restore
mongorestore --uri="$MONGODB_URI" --drop "${BACKUP_DIR}"
```

---

## Monitoring Checklist

```
API Monitoring:
- [ ] /health endpoint returns 200 with DB connection status
- [ ] /api/v1/health returns service versions
- [ ] API response time logged per route
- [ ] Import worker heartbeat every 30 seconds
- [ ] Alert on worker heartbeat failure

Logs:
- [ ] Structured JSON logs (not plain text)
- [ ] Every request: request_id, route, duration_ms, status_code, user_id
- [ ] Import completion logged with counts
- [ ] Errors include stack trace (not shown to user)
- [ ] No passwords/tokens in any log line

MongoDB:
- [ ] Monitor slow queries (> 100ms)
- [ ] Monitor disk space
- [ ] Daily backup with restore test monthly
```

---

## README.md Structure

```markdown
# SolarScope

Solar Panel Performance Intelligence & Energy Analytics

## Quick Start (Development)
1. Clone repo
2. Copy .env.example to .env
3. docker-compose up

## Production Deployment
1. Set up .env.production
2. docker-compose -f docker-compose.prod.yml up -d

## First-time Setup
1. Create first user (seed script)
2. Create workspace
3. Download sample CSV from /imports/sample

## API Docs
http://localhost:8000/docs

## Running Tests
cd backend && pytest
cd frontend && npm test
```

---

## Final Release Checklist

```
Product:
- [ ] All 14 phases completed
- [ ] E2E journey works in production environment
- [ ] No hardcoded metrics on any screen

Security:
- [ ] HTTPS configured and working
- [ ] Secrets in environment (not in code)
- [ ] Rate limiting active
- [ ] Cross-tenant isolation verified

Operations:
- [ ] Backup created and restore tested
- [ ] Health endpoints returning 200
- [ ] Worker heartbeat active
- [ ] Log output flowing to file/service

Documentation:
- [ ] README with setup guide
- [ ] API docs at /docs
- [ ] User guide covering import-to-report workflow
- [ ] Sample CSVs downloadable from app
```

---

## Exit Gate — All Must Pass

- [ ] Application accessible at HTTPS URL in production
- [ ] docker-compose -f docker-compose.prod.yml up -d starts all 5 services
- [ ] Health endpoint returns 200 with MongoDB connected
- [ ] Real data can be imported in production environment
- [ ] MongoDB backup created and restore tested successfully
- [ ] README + user guide complete
- [ ] No secrets committed to git repository
- [ ] SSL certificate valid (not expired)
- [ ] Final E2E journey test passes on production URL

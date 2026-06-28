# Route53 Clone

A functional clone of the AWS Route 53 web console with persistent SQLite storage and a FastAPI backend. This project recreates the Route 53 user experience and core workflows (hosted zones and DNS records) without implementing actual DNS resolution.

## Demo Credentials

| Username | Password  |
|----------|-----------|
| admin    | admin123  |
| demo     | demo123   |

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python run.py
```

API runs at **http://127.0.0.1:8000**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:3000**

The frontend proxies `/api/*` requests to the backend so session cookies work on the same origin.

### One-command start (macOS/Linux)

```bash
chmod +x start.sh
./start.sh
```

### Docker (production-like)

```bash
docker compose up --build
```

Then open **http://localhost:3000** (login: admin / admin123).

### Deploy to Render (live demo)

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New Blueprint**
3. Connect the repo — Render reads `render.yaml` and creates both services
4. Set `ALLOWED_ORIGINS` on the API service to your frontend URL (e.g. `https://route53-web.onrender.com`)
5. Open the frontend URL — demo is live

### Deploy frontend to Vercel

1. Import the `frontend/` folder to Vercel
2. Set `API_URL` to your deployed backend URL
3. Update `frontend/vercel.json` rewrite destination to match

### Database migrations

```bash
cd backend
source venv/bin/activate
alembic upgrade head          # apply migrations
alembic revision --autogenerate -m "description"  # new migration
```

---

## Architecture Overview

```
┌─────────────────┐      /api/* proxy       ┌──────────────────┐
│  Next.js (3000) │ ──────────────────────► │ FastAPI (8000)   │
│  TypeScript UI  │      credentials        │ REST API         │
└─────────────────┘                         └────────┬─────────┘
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │ SQLite DB    │
                                              │ route53.db   │
                                              └──────────────┘
```

### Frontend (`frontend/`)

- **Next.js 14** App Router with TypeScript
- **AWS Cloudscape Design System** — official AWS UI components (AppLayout, TopNavigation, Table, Modal)
- Auth context with session persistence via HTTP-only cookies
- Pages: Login, Hosted Zones (list/create/edit/delete), Zone Detail with DNS Records CRUD
- Placeholder pages: Dashboard, Health Checks, Traffic Policies, Resolver, Profiles

### Backend (`backend/`)

- **FastAPI** REST API with SQLAlchemy ORM
- **Alembic** database migrations with composite indexes
- Cookie-based session authentication (mock IAM)
- CRUD for hosted zones and DNS records with search, filters, and pagination
- BIND import/export, bulk delete endpoints
- Auto-seeds demo users and sample hosted zones on startup

---

## Database Schema

### `users`
| Column         | Type     | Description              |
|----------------|----------|--------------------------|
| id             | INTEGER  | Primary key              |
| username       | STRING   | Unique login name       |
| password_hash  | STRING   | Bcrypt hashed password  |
| display_name   | STRING   | Display name in UI      |
| account_id     | STRING   | Mock AWS account ID     |
| created_at     | DATETIME | Creation timestamp      |

### `sessions`
| Column     | Type     | Description                    |
|------------|----------|--------------------------------|
| id         | STRING   | Primary key (session token)   |
| user_id    | INTEGER  | FK → users.id                 |
| created_at | DATETIME | Session created               |
| expires_at | DATETIME | Session expiry (7 days)       |

### `hosted_zones`
| Column       | Type     | Description                         |
|--------------|----------|-------------------------------------|
| id           | STRING   | Primary key (e.g. /hostedzone/ABC)  |
| name         | STRING   | Domain name (e.g. example.com.)     |
| description  | TEXT     | Optional description                |
| comment      | TEXT     | Optional comment                    |
| type         | STRING   | Public or Private                   |
| record_count | INTEGER  | Cached record count                 |
| private_vpc  | STRING   | VPC ID for private zones            |
| created_at   | DATETIME | Created timestamp                   |
| updated_at   | DATETIME | Last updated                        |

### `dns_records`
| Column          | Type     | Description                          |
|-----------------|----------|--------------------------------------|
| id              | STRING   | Primary key                          |
| hosted_zone_id  | STRING   | FK → hosted_zones.id                 |
| name            | STRING   | Record name (FQDN)                   |
| type            | STRING   | A, AAAA, CNAME, TXT, MX, NS, etc.   |
| ttl             | INTEGER  | Time to live in seconds              |
| value           | TEXT     | Record value(s)                      |
| routing_policy  | STRING   | Simple (default)                     |
| set_identifier  | STRING   | Optional routing identifier          |
| weight          | INTEGER  | Optional weight                      |
| region          | STRING   | Optional region                      |
| failover        | STRING   | Optional failover type               |
| health_check_id | STRING   | Optional health check                |
| alias_target    | BOOLEAN  | Whether record is an alias           |
| created_at      | DATETIME | Created timestamp                    |
| updated_at      | DATETIME | Last updated                         |

---

## API Overview

### Authentication

| Method | Endpoint        | Description                    |
|--------|-----------------|--------------------------------|
| POST   | `/api/auth/login`  | Login, sets session cookie  |
| POST   | `/api/auth/logout` | Logout, clears cookie       |
| GET    | `/api/auth/me`     | Get current user (auth req) |

### Hosted Zones

| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/api/hosted-zones`       | List (search, filter, paginate) |
| POST   | `/api/hosted-zones`       | Create zone (+ NS/SOA)   |
| GET    | `/api/hosted-zones/{id}`  | Get zone by ID           |
| PUT    | `/api/hosted-zones/{id}`  | Update zone              |
| DELETE | `/api/hosted-zones/{id}`  | Delete zone + records    |

**Query params (list):** `search`, `type`, `page`, `page_size`

### DNS Records

| Method | Endpoint                                      | Description        |
|--------|-----------------------------------------------|--------------------|
| GET    | `/api/hosted-zones/{zone_id}/records`         | List records       |
| POST   | `/api/hosted-zones/{zone_id}/records`         | Create record      |
| GET    | `/api/hosted-zones/{zone_id}/records/{id}`    | Get record         |
| PUT    | `/api/hosted-zones/{zone_id}/records/{id}`    | Update record      |
| DELETE | `/api/hosted-zones/{zone_id}/records/{id}`    | Delete record      |

**Query params (list):** `search`, `type`, `page`, `page_size`

**Supported record types:** A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA (+ SOA for zone apex)

### Health

| Method | Endpoint      | Description   |
|--------|---------------|---------------|
| GET    | `/api/health` | Health check  |

---

## Features

- Mock authentication with session persistence
- Full CRUD for hosted zones and DNS records
- Search, type filters, pagination, and clear-filters
- AWS Route 53-style UI: top console bar, left sidebar, tables, modals, toasts
- Row selection with bulk delete (zones and records)
- Actions dropdown menus per row
- Copy-to-clipboard for hosted zone IDs
- Loading skeletons (no full-page spinners on tables)
- **Dark mode** toggle (header button or ⌘⇧D)
- **Keyboard shortcuts**: ⌘K search, ⌘N create, G→H go to hosted zones, ⌘/ help
- **Import BIND** zone files into a hosted zone
- **Export** hosted zones as JSON or BIND
- Docker Compose for one-command deployment
- Sample data seeded on first run
- Placeholder sections for non-core Route 53 features

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── database.py       # SQLAlchemy setup
│   │   ├── models.py         # ORM models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── auth.py           # Session auth helpers
│   │   └── routers/
│   │       ├── auth.py
│   │       └── hosted_zones.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   └── src/
│       ├── app/              # Next.js pages
│       ├── components/       # UI & layout
│       ├── context/          # Auth & notifications
│       └── lib/              # API client & types
└── README.md
```

## Deployment Notes

For production deployment:

1. Deploy FastAPI backend (e.g. Railway, Render, EC2)
2. Deploy Next.js frontend (e.g. Vercel)
3. Set `API_URL` in frontend environment to point to the backend
4. Update CORS origins in `backend/app/main.py` to include your frontend URL
5. Use a production WSGI server (gunicorn + uvicorn workers) for the API

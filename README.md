# Amazon Route 53 Console Clone

A high-fidelity, full-stack recreation of the AWS Route 53 management console. This application emulates the official AWS user experience and core DNS management workflows (including Hosted Zones and DNS Records) with persistent database storage, input validation, and deployment configurations.

Developed as a technical assessment for the Scalar Intern role.

---

## Technical Stack & Architecture

```
┌─────────────────────────────────┐
│          Next.js Client         │
│     (TypeScript & Cloudscape)   │
└────────────────┬────────────────┘
                 │
                 │ Session Cookies / API Requests
                 ▼
┌─────────────────────────────────┐
│         FastAPI Backend         │
│        (Uvicorn / Gunicorn)     │
└────────────────┬────────────────┘
                 │
                 │ SQLAlchemy ORM
                 ▼
┌─────────────────────────────────┐
│           SQLite DB             │
│        (Alembic Migrations)     │
└─────────────────────────────────┘
```

### Frontend (`/frontend`)
- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI Components**: AWS Cloudscape Design System — the official library used by AWS to build console interfaces, ensuring visual parity.
- **Authentication**: Session persistence managed via secure cookies.
- **Pages & Views**:
  - Interactive Dashboard (Live resource counters and recent activity log)
  - Hosted Zones list and Zone Details (Record Set CRUD)
  - Health Checks management
  - Keyboard Shortcuts panel and Theme Toggle (Light/Dark mode)

### Backend (`/backend`)
- **Framework**: FastAPI (Python 3.12+)
- **ORM & DB**: SQLAlchemy with SQLite for persistence, managed via Alembic migrations.
- **Auth**: Cookie-based session authentication with bcrypt password hashing.
- **Key Services**:
  - API endpoints for Zone & Record CRUD with filtering, searching, and pagination.
  - DNS Record Validation (syntactic verification of IPs, CNAME/MX formats).
  - BIND Zone File parser for importing and exporting standard zone files.

---

## Key Features

- **AWS High-Fidelity UI**: Implements the AWS header navigation, left-hand sidebar navigation, breadcrumbs, table loading skeletons, interactive modals, and notification toasts.
- **DNS Record Validation**: Prevents invalid configurations by checking IPv4/IPv6 addresses, CNAME target formatting, and MX priority syntax before database commits.
- **Advanced Routing Support**: Interface capabilities to configure Routing Policies (Simple, Weighted, Failover, Geolocation) and Alias Targets.
- **Data Portability**: Full BIND zone file compatibility — import configurations directly or export zones to BIND formatting.
- **Responsive Theme Support**: Seamless dark mode support toggled from the top navigation bar or via keyboard shortcut (`Command + Shift + D`).
- **Developer Workflows**: Keyboard shortcut navigation (`Command + K` for search, `Command + N` for resource creation) to emulate power-user experiences.

---

## Database Design

### Schema Overview

#### `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY | Unique identifier |
| `username` | VARCHAR | UNIQUE | Login username |
| `password_hash` | VARCHAR | NOT NULL | Bcrypt hashed password |
| `display_name` | VARCHAR | | Console display name |
| `account_id` | VARCHAR | | Mock AWS Account ID |
| `created_at` | DATETIME | | Creation timestamp |

#### `sessions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR | PRIMARY KEY | Session token |
| `user_id` | INTEGER | FK → `users.id` | Associated user |
| `created_at` | DATETIME | | Session initialization |
| `expires_at` | DATETIME | | Token expiration time |

#### `hosted_zones`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR | PRIMARY KEY | Unique Zone ID (e.g. `/hostedzone/...`) |
| `name` | VARCHAR | NOT NULL | Domain name (e.g., `example.com.`) |
| `description` | TEXT | | Optional zone description |
| `comment` | TEXT | | Optional internal comment |
| `type` | VARCHAR | NOT NULL | Public or Private |
| `record_count` | INTEGER | DEFAULT 0 | Counter cache for DNS records |
| `private_vpc` | VARCHAR | | Target VPC ID (for private zones) |
| `created_at` | DATETIME | | Timestamp of creation |
| `updated_at` | DATETIME | | Timestamp of last modification |

#### `dns_records`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR | PRIMARY KEY | Unique Record ID |
| `hosted_zone_id` | VARCHAR | FK → `hosted_zones.id` | Parent hosted zone |
| `name` | VARCHAR | NOT NULL | Fully Qualified Domain Name (FQDN) |
| `type` | VARCHAR | NOT NULL | A, AAAA, CNAME, MX, TXT, NS, etc. |
| `ttl` | INTEGER | | Time To Live (seconds) |
| `value` | TEXT | NOT NULL | Target values (newline or space separated) |
| `routing_policy` | VARCHAR | DEFAULT 'Simple' | Routing mode |
| `set_identifier` | VARCHAR | | ID for weighted/failover routing |
| `weight` | INTEGER | | Weight integer for weighted routing |
| `region` | VARCHAR | | Region code for geolocation routing |
| `failover` | VARCHAR | | Primary/Secondary failover status |
| `health_check_id` | VARCHAR | | Associated health check |
| `alias_target` | BOOLEAN | DEFAULT FALSE | Alias record identifier |

---

## API Reference

### Authentication
- `POST /api/auth/login` - Authenticate credentials and receive session cookie.
- `POST /api/auth/logout` - Invalidate the current session and clear cookies.
- `GET /api/auth/me` - Fetch details of the currently authenticated user.

### Hosted Zones
- `GET /api/hosted-zones` - Paginated list of hosted zones with search and type filters.
- `POST /api/hosted-zones` - Create a new hosted zone (automatically initializes SOA and NS records).
- `GET /api/hosted-zones/{id}` - Retrieve details of a specific hosted zone.
- `DELETE /api/hosted-zones/{id}` - Cascade delete a hosted zone and all its records.

### DNS Records
- `GET /api/hosted-zones/{zone_id}/records` - List records within a hosted zone with filters.
- `POST /api/hosted-zones/{zone_id}/records` - Add a new record (includes format validation).
- `PUT /api/hosted-zones/{zone_id}/records/{id}` - Update existing record configurations.
- `DELETE /api/hosted-zones/{zone_id}/records/{id}` - Remove a specific record.

---

## Getting Started

### Prerequisites
- **Python**: 3.12+
- **Node.js**: 18+
- **npm** or equivalent package manager

### Standard Local Execution

1. **One-Command Bootstrapper**:
   Initialize and run both frontend and backend services concurrently using the included shell script:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

2. **Manual Backend Setup**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   python run.py
   ```
   *The backend REST API starts at `http://127.0.0.1:8000`.*

3. **Manual Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *The frontend Next.js server starts at `http://localhost:3000`.*

---

## Production Deployment & Quality Assurance

### Docker Compose
Run the production bundle locally with security-optimized configurations:
```bash
chmod +x prod.sh
./prod.sh
```
This launches:
- **Next.js Standalone Container**: Serving optimized production assets.
- **FastAPI Gunicorn Container**: Running multiple Uvicorn worker threads.
- **Docker Health Checks & Restart Policies**: Configured for maximum uptime.

### Automated Testing
API verification suite runs using `pytest` to validate core logic, session management, and validation boundary conditions:
```bash
cd backend
pytest
```

### Production Checklist Implemented
- Next.js Standalone build pipeline with security headers.
- Gunicorn web server wrapping FastAPI for request concurrency.
- API documentation hidden in production by default (controllable via `ENABLE_DOCS`).
- Alembic database migration runner integrated into container initialization.
- Pytest verification embedded in CI configurations.

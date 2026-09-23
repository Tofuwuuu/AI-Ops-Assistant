# AI Ops Assistant

A junior full-stack and AI portfolio demo of ops and support tooling: the React dashboard takes a request, FastAPI queues an agent, and the draft stays unsent until a person approves it.

The repository and API title stay **AI Ops Assistant**. The UI product name is **Archivist** — the document title is `Archivist — Operational Intelligence`, and the seeded account branding uses that name.

Placeholder or missing `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GROQ_API_KEY` values select `MockAdapter`. The pipeline still runs offline with canned classify and draft JSON. `GET /health` does not report which adapter a host is using.

## Status and demo

Live UI, HTTP 200 on 23 Sep 2026: [https://ai-ops-assistant-wheat.vercel.app/](https://ai-ops-assistant-wheat.vercel.app/)

That Vercel host serves the static React app. `frontend/vercel.json` rewrites every path to `index.html`, so `/health` and `/api` on that origin are the same HTML page. Postgres, Redis, the worker, and n8n are Compose services, and they are the primary full-stack demo.

The built bundle calls a separate FastAPI process at [https://backend-production-cd8c.up.railway.app](https://backend-production-cd8c.up.railway.app). Checked the same day: `GET /health` returned `{"status":"ok","app":"AI Ops Assistant"}`, `/docs` served Swagger, and CORS allowed the Vercel origin. Demo sign-in returned the seeded account (`branding_json.name` is `Archivist`). Those checks show a live API with stored data. They do not show Redis, a worker process, or n8n on that host. Compose runs those as their own services. A single-service API can optionally start the worker in-process when `RUN_WORKER_INPROCESS=true`; Compose leaves that unset.

Sign in with the credentials already filled on the login screen (seeded on first API boot): `admin@demo.example.com` / `demo1234`.

## Screenshots

Captured from the live Vercel UI on 23 Sep 2026 after demo sign-in. The ticket data comes from the Railway API. Docker Compose is still the setup that runs Postgres, Redis, the worker, and n8n together.

![Archivist dashboard with pipeline stats and the active queue](docs/screenshots/dashboard.png)

Dashboard — pipeline stats and the active ticket queue.

![Conversations inbox with a billing ticket and the AI copilot draft](docs/screenshots/inbox.png)

Conversations — ticket list beside the AI copilot draft.

![Ticket detail with the agent pipeline and an unsent draft](docs/screenshots/ticket-detail.png)

Ticket detail — agent pipeline timeline and the draft waiting for approval.

![Analytics charts computed from stored tickets](docs/screenshots/analytics.png)

Reporting — status, category, confidence, and decision charts from stored tickets.

## Architecture

```
User (React) → FastAPI → Postgres / Redis queue
                              ↓
                         Agent Worker
                    classify → retrieve → reason → generate → validate → persist → handoff
                              ↓
                            n8n (audit / retry / notify)
```

## Quick start

### 1. Environment

```bash
cp .env.example .env
# Optional: set OPENAI_API_KEY, or ANTHROPIC_API_KEY with LLM_PROVIDER=anthropic,
# or GROQ_API_KEY with LLM_PROVIDER=groq.
# Placeholder keys keep MockAdapter on the same pipeline.
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

Ports match `docker-compose.yml`:

| Service   | URL / port                  |
|-----------|-----------------------------|
| Frontend  | http://localhost:5173       |
| API       | http://localhost:8000       |
| API docs  | http://localhost:8000/docs  |
| n8n       | http://localhost:5678       |
| Postgres  | localhost:5432              |
| Redis     | localhost:6379              |

Default n8n login: `admin` / `changeme` (override with `N8N_BASIC_AUTH_USER` and `N8N_BASIC_AUTH_PASSWORD` in `.env`).

The Compose frontend is built with `VITE_API_BASE_URL=http://localhost:8000`, so the browser talks to the published API port.

### 3. Import the n8n workflow

1. Open http://localhost:5678
2. **Workflows → Import from File** → `n8n/workflows/ops-assistant.json`
3. Activate the workflow so `/webhook/ops-assistant` is live
4. Align the `X-Webhook-Secret` header with `N8N_WEBHOOK_SECRET`

### 4. Try a ticket

1. Open http://localhost:5173 and sign in (`admin@demo.example.com` / `demo1234` on a fresh database)
2. Submit a request (for example, “How do I reset my password?”)
3. Open the ticket detail page and watch the agent timeline
4. Review the AI draft and **Approve** or **Reject**

## Agent tools (v1)

Only three tools by design:

- `search_knowledge_base(query)`
- `get_ticket(ticket_id)`
- `save_draft(ticket_id, draft, confidence)`

Knowledge base docs live in `knowledge_base/*.md` and are seeded into Postgres (`kb_docs`) on startup. Retrieval uses Postgres full-text (`tsvector`) with `ILIKE` fallback.

## Safety

- API keys stay in environment variables (see `.env.example`; `.env` is gitignored)
- Every agent step is written to `agent_logs` with secret redaction
- Draft validation scans for secrets, empty or too-short text, and a small toxic-term list
- **No automatic outbound send** — `approved` is set only by a signed-in user calling the dashboard approve action while the ticket is `needs_review`
- Redis rate limiting on ticket creation
- Dashboard routes require a JWT. The demo user above is created on first boot

## Local development (apps outside Compose)

Infra still comes from Compose. Published ports are Postgres `5432` and Redis `6379`.

```bash
docker compose up postgres redis -d

# Backend (from repo root)
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://ops:ops@localhost:5432/ai_ops
export REDIS_URL=redis://localhost:6379/0
# Windows cmd: set DATABASE_URL=...  and  set REDIS_URL=...
uvicorn app.main:app --reload      # http://localhost:8000
# Separate terminal, same venv and env:
python -m app.worker

# Frontend
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

`KB_DOCS_PATH` defaults to `../knowledge_base` when the API is started from `backend/`. Compose sets it to `/app/knowledge_base`.

## Known limitations (v1)

- The public Vercel URL is the static Archivist UI plus whatever the Railway API process is doing. Docker Compose is the setup that runs Postgres, Redis, a dedicated worker, n8n, and the frontend together
- LLM mock mode when provider API keys are missing or still the `.env.example` placeholders
- n8n notification channels are stubbed (ack / retry only)
- Keyword retrieval only (no embeddings / pgvector yet)
- The demo login is a shared bootstrap password

## License

MIT — see [LICENSE](LICENSE).

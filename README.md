# AI Ops Assistant

Modular AI Ops pipeline: React dashboard → FastAPI gateway → Redis-queued agent worker → Postgres + Redis → n8n orchestration. Drafts always require **human approval** before anything is considered sent.

UI inspired by calm blue SaaS support dashboards ([Dribbble reference](https://dribbble.com/shots/27393788-AI-Powered-Customer-Support-Dashboard-UI-Design)).

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
# Optional: set OPENAI_API_KEY (or ANTHROPIC_API_KEY + LLM_PROVIDER=anthropic)
# Without a real key the MockAdapter still runs the full pipeline offline.
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

| Service   | URL                         |
|-----------|-----------------------------|
| Frontend  | http://localhost:5173       |
| API       | http://localhost:8000       |
| API docs  | http://localhost:8000/docs  |
| n8n       | http://localhost:5678       |

Default n8n login: `admin` / `changeme` (override via `.env`).

### 3. Import the n8n workflow

1. Open http://localhost:5678
2. **Workflows → Import from File** → `n8n/workflows/ops-assistant.json`
3. Activate the workflow so `/webhook/ops-assistant` is live
4. Align the `X-Webhook-Secret` header with `N8N_WEBHOOK_SECRET`

### 4. Try a ticket

1. Open the dashboard and submit a request (e.g. “How do I reset my password?”)
2. Open the ticket detail page — watch the agent timeline update
3. Review the AI draft and **Approve** or **Reject**

## Agent tools (v1)

Only three tools by design:

- `search_knowledge_base(query)`
- `get_ticket(ticket_id)`
- `save_draft(ticket_id, draft, confidence)`

Knowledge base docs live in `knowledge_base/*.md` and are seeded into Postgres (`kb_docs`) on startup. Retrieval uses Postgres full-text (`tsvector`) with `ILIKE` fallback.

## Safety

- API keys stay in environment variables (see `.env.example`; `.env` is gitignored)
- Every agent step is written to `agent_logs` with secret redaction
- Draft validation scans for secrets / empty / toxic content
- **No automatic outbound send** — `approved` is set only by a human in the dashboard
- Redis rate limiting on ticket creation (auth is intentionally deferred for v1)

## Local development (without Docker for apps)

```bash
# Infra
docker compose up postgres redis -d

# Backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
set DATABASE_URL=postgresql+psycopg://ops:ops@localhost:5432/ai_ops
set REDIS_URL=redis://localhost:6379/0
uvicorn app.main:app --reload
# Separate terminal:
python -m app.worker

# Frontend
cd frontend
npm install
npm run dev
```

## Known limitations (v1)

- No user authentication (single implicit operator)
- LLM mock mode when API keys are placeholders
- n8n notification channels are stubbed (ack / retry only)
- Keyword retrieval only (no embeddings / pgvector yet)

## License

MIT — open source scaffold.

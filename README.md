# AI Ops Assistant

Support tooling where an agent drafts the reply and a person sends it. You submit a request in the React dashboard, FastAPI queues it, a worker classifies it, pulls from the knowledge base and writes a draft. Nothing goes out until someone hits Approve.

![Archivist dashboard with pipeline stats and the active queue](docs/screenshots/dashboard.png)

Live UI: https://ai-ops-assistant-wheat.vercel.app/

That's the frontend only, on sample data, with no sign-in. Anything that needs the backend, like Approve and Send, is off. Run it locally for the real thing.

```
User (React) → FastAPI → Postgres / Redis queue
                              ↓
                         Agent Worker
                    classify → retrieve → reason → generate → validate → persist → handoff
                              ↓
                            n8n (audit / retry / notify)
```

## Run it

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend python -m app.migrate
docker compose exec backend python -m app.seed_demo
```

The backend already runs migrations on start, so the third line is a no-op on a fresh boot. The seed adds fake contacts and an open invoice.

Open http://localhost:5173. It signs you in as the demo user. If it doesn't, use `admin@demo.example.com` / `demo1234`. Stop with `docker compose down`.

| Service | Where |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 (docs at `/docs`) |
| n8n | http://localhost:5678, `admin` / `changeme` |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

API keys are optional. Set `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` with `LLM_PROVIDER=anthropic`, or `GROQ_API_KEY` with `LLM_PROVIDER=groq`. Missing or placeholder keys fall back to `MockAdapter`, which returns canned classify and draft JSON so the whole pipeline still runs offline. Email, SMS and Stripe are mocked the same way. `GET /health` doesn't tell you which adapter is active.

In the UI the product is called Archivist (page title `Archivist — Operational Intelligence`). The repo and API keep the AI Ops Assistant name.

For n8n: open it, import `n8n/workflows/ops-assistant.json`, activate it so `/webhook/ops-assistant` is live, and match the `X-Webhook-Secret` header to `N8N_WEBHOOK_SECRET`.

To try it, submit something like "How do I reset my password?", open the ticket, watch the agent timeline, then approve or reject the draft.

## Running the apps outside Compose

```bash
docker compose up postgres redis -d

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg://ops:ops@localhost:5432/ai_ops
export REDIS_URL=redis://localhost:6379/0
export APP_ENV=development   # otherwise it wants a real JWT_SECRET_KEY
uvicorn app.main:app --reload
python -m app.worker         # second terminal

cd frontend && npm install && npm run dev
```

## How the agent works

It has three tools and that's on purpose: `search_knowledge_base(query)`, `get_ticket(ticket_id)` and `save_draft(ticket_id, draft, confidence)`. Docs in `knowledge_base/*.md` load into Postgres on startup. Search is Postgres full-text with an `ILIKE` fallback, no embeddings.

Every step is logged to `agent_logs` with secrets redacted. Drafts get checked for secrets, empty or too-short text, and a small list of toxic terms. A ticket only becomes `approved` when a signed-in user approves it from `needs_review`. Ticket creation is rate limited in Redis, and dashboard routes need a JWT.

## Limits

- The Vercel site has no backend.
- Mock LLM when keys are missing.
- n8n notifications are stubbed, ack and retry only.
- Keyword retrieval only.
- The demo login is a shared password.

The screenshots below are from 23 Sep 2026, when the live site still had a backend.

![Conversations inbox with a billing ticket and the AI copilot draft](docs/screenshots/inbox.png)
![Ticket detail with the agent pipeline and an unsent draft](docs/screenshots/ticket-detail.png)
![Analytics charts computed from stored tickets](docs/screenshots/analytics.png)

MIT. See [LICENSE](LICENSE).

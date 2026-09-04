FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# SERVICE_ROLE=web (default) runs the API; SERVICE_ROLE=worker runs the agent/campaign
# worker loop. This lets the same image serve both Railway services without a
# per-service Dockerfile CMD override. $PORT is injected by the hosting platform.
CMD ["sh", "-c", "if [ \"$SERVICE_ROLE\" = \"worker\" ]; then python -m app.worker; else uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}; fi"]

# AI Store — AI-Powered Web App Store

A minimal AI-first marketplace MVP: describe an application, generate a validated application specification with Grok/xAI, persist it in PostgreSQL, and open/share a stable app URL.

## Stack
React + Vite, FastAPI + Pydantic, PostgreSQL + SQLAlchemy, xAI/Grok provider, Render deployment.

## Local backend
1. cd backend
2. python -m venv .venv
3. Activate the environment.
4. pip install -r requirements.txt
5. Copy .env.example to .env.
6. Set DATABASE_URL and XAI_API_KEY.
7. uvicorn app.main:app --reload --port 8000

## Local frontend
1. cd frontend
2. npm install
3. Copy .env.example to .env.
4. Set VITE_API_URL=http://localhost:8000
5. npm run dev

## API
GET /health
POST /api/search
POST /api/apps/generate
GET /api/apps
GET /api/apps/{id-or-slug}
POST /api/apps/{slug}/share

Interactive documentation is available at /docs.

## Render
Use render.yaml for the FastAPI service. Create a PostgreSQL database and configure DATABASE_URL, XAI_API_KEY, CORS_ORIGINS and PUBLIC_APP_URL. A separate static frontend can use VITE_API_URL pointing to the deployed API.

## Security
Secrets stay in environment variables. AI output is parsed and validated by Pydantic. No AI-generated code is executed. Before high-volume public use, add Redis or gateway-backed rate limiting and authentication.

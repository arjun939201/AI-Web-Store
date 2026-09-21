# AI Store — AI-Powered Web App Store

AI Store is an AI-first web app marketplace. Users describe what they want to build, the backend asks Grok/xAI for a structured application specification, validates it, stores it in PostgreSQL, and returns a shareable application URL.

## Production architecture

- **Frontend:** React + Vite → Render Static Site
- **Backend:** FastAPI + Pydantic → Render Web Service
- **Database:** PostgreSQL → Render managed database
- **AI:** xAI/Grok through `XAI_API_KEY`
- **Deployment:** `render.yaml`

The AI generates structured specifications, not executable server-side code.

## Deploy with Render Blueprint

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint** and select this repository.
3. Render reads `render.yaml` and creates:
   - `ai-store-api`
   - `ai-store-web`
   - `ai-store-db`
4. Enter the secret `XAI_API_KEY` when Render requests it.
5. After deployment, verify:
   - `https://ai-store-api.onrender.com/health`
   - `https://ai-store-web.onrender.com`

### Important: Render URLs

The names in `render.yaml` are the default Render service names. If you rename a service or Render assigns a different public URL, update:

- backend `CORS_ORIGINS`
- backend `PUBLIC_APP_URL`
- frontend `VITE_API_URL`

## Local development

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
# macOS/Linux: cp .env.example .env

uvicorn app.main:app --reload --port 8000
```

Set `DATABASE_URL` and `XAI_API_KEY` in `.env`.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set:

```
VITE_API_URL=http://localhost:8000
```

## API

- `GET /health`
- `POST /api/search`
- `POST /api/apps/generate`
- `GET /api/apps`
- `GET /api/apps/{id-or-slug}`
- `POST /api/apps/{slug}/share`
- `GET /docs`

## Environment variables

Backend:

```
DATABASE_URL=
XAI_API_KEY=
XAI_MODEL=grok-3-mini
XAI_BASE_URL=https://api.x.ai/v1/chat/completions
AI_PROVIDER=grok
CORS_ORIGINS=
PUBLIC_APP_URL=
```

Frontend:

```
VITE_API_URL=
```

Never put `XAI_API_KEY` or database credentials in frontend variables.

## Security

AI output is validated with Pydantic before persistence. Generated AI code is never executed by the backend. Production traffic should additionally use authentication and a Redis/gateway-backed rate limiter before high-volume public use.

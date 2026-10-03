# Deployment Guide: Audio Notes Platform

This platform is production-ready and can be deployed with zero manual server configuration. Follow any of the options below.

---

## Option 1: Fast Free Deployment (Recommended)
- **Frontend**: [Vercel](https://vercel.com) (Free tier)
- **Backend & PostgreSQL**: [Render](https://render.com) or [Railway](https://railway.app) (Free tier)

### 1. Deploy the Backend & Database (Render)
1. Push your repository to GitHub.
2. Sign in to [Render](https://dashboard.render.com).
3. Click **New +** &rarr; **PostgreSQL**.
   - Name: `audio-notes-db`
   - Copy the internal/external database URL.
4. Click **New +** &rarr; **Web Service**.
   - Select your GitHub repo.
   - Root directory: leave empty or `.`
   - Runtime: `Python 3`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - Set Environment Variables:
     - `DATABASE_URL`: Your Render Postgres connection string (starts with `postgresql://`)
     - `GNANI_API_KEY`: Your Gnani Prisma API key (from [app.gnani.ai](https://app.gnani.ai/voice/speech-to-text))
     - `GNANI_API_BASE_URL`: `https://api.vachana.ai`
     - `GEMINI_API_KEY`: Your Google Gemini API key (from Google AI Studio)
     - `LLM_PROVIDER`: `gemini` (or `auto`)
     - `STORAGE_TYPE`: `local`
     - `CORS_ORIGINS`: `["*"]`
5. Click **Create Web Service**. Once deployed, copy your backend URL (e.g. `https://audio-notes-backend.onrender.com`).

---

### 2. Deploy Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** &rarr; **Project**.
2. Select your repository.
3. Configure the Project:
   - Root Directory: select `frontend`
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://audio-notes-backend.onrender.com/api` (replace with your Render backend URL)
5. Click **Deploy**. Vercel will build and assign you a live HTTPS URL (e.g. `https://audio-notes-ai.vercel.app`).

---

## Option 2: 1-Click Render Blueprint
If you prefer deploying everything on Render simultaneously:
1. Connect your repository to Render.
2. Click **New +** &rarr; **Blueprint**.
3. Select `render.yaml` from this repository.
4. Fill in `GNANI_API_KEY` and `GEMINI_API_KEY`. Render will automatically create:
   - PostgreSQL Database (`audio-notes-db`)
   - FastAPI Backend Web Service
   - Next.js Frontend Web Service

---

## Option 3: Single VPS / Docker Compose Deployment
Run the entire platform on any Ubuntu / Debian VPS with Docker installed:
```bash
# Clone the repository
git clone <your-repo-url> gnani-audio-notes
cd gnani-audio-notes

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env and supply GNANI_API_KEY and GEMINI_API_KEY

# Launch all 3 services (Postgres + FastAPI + Next.js)
docker compose up -d --build
```
The app will immediately be live:
- **Frontend**: `http://<your-server-ip>:3000`
- **Backend API**: `http://<your-server-ip>:8000/docs`

# Audio Notes AI Platform
### Intelligent Speech-to-Text & Executive Summarization Platform
Powered by **Gnani ASR** (Prisma v2.5) &bull; **FastAPI** &bull; **Next.js 15** &bull; **PostgreSQL** &bull; **LLMs**

---

## 🌟 Key Features

1. **Audio Ingestion of Any Duration**:
   - Comfortably handles 2+ minute recordings without timeouts or page freezes.
   - Drag-and-drop file upload (MP3, WAV, M4A, AAC, OGG, FLAC) up to 100MB.
   - Built-in **Browser Microphone Recording** to record live memos directly into the pipeline.
   - One-click **2-Minute Demo Audio Generator** for immediate end-to-end evaluation without local audio files.

2. **Intelligent Gnani ASR Pipeline**:
   - Short audio ($\le$60s) $\to$ Fast synchronous **Gnani REST STT** (`POST /stt/v3`).
   - Long audio ($>$60s) $\to$ Automated **Gnani Batch Jobs API** (`POST /stt/v3/batch/jobs` $\to$ `/start` $\to$ polling $\to$ `/files`).
   - Secondary WAV chunking pipeline with parallel transcription and sentence boundary stitching.
   - High-fidelity **Sandbox Simulator** when API keys are not yet configured or credit is exhausted.

3. **Structured LLM Summarization**:
   - Multi-provider support: **Google Gemini**, **OpenAI**, or **Groq**.
   - Structured JSON schema output:
     - **Executive Summary (TL;DR)**
     - **Key Discussion Points**
     - **Interactive Action Items Checklist** (with state toggling)
     - **Conversational Tone & Sentiment Tagging**
     - **Downloadable & Copyable Markdown**

4. **Past Recordings Library & Permalinks**:
   - Instant search and filtering across past notes.
   - One-click note reopening with full playback, transcript, and summary.
   - Direct shareable URLs (`/notes/[id]`).

5. **Integrated Audio Player**:
   - Custom HTML5 audio player with scrubber, animated equalizer bars, playback rate control (1x, 1.25x, 1.5x, 2x), and skip-back 10s.

6. **Dedicated `/architecture` Page**:
   - Visual interactive end-to-end pipeline diagram.
   - In-depth written answers covering upload flow, storage architecture, long audio handling, synchronous vs. background tasks, failure resilience, and future roadmap.

7. **Visible Failure Resilience**:
   - Stage-by-stage real-time progress bar (Queued $\to$ Audio Analysis $\to$ Gnani ASR $\to$ AI Summarizer $\to$ Completed).
   - Transparent diagnostic failure cards with readable error traces and a 1-click **"Retry Job"** action.

---

## 🚀 Quick Start (Local Run)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# Navigate to backend and create virtual environment
cd backend
python -m venv venv

# Activate venv (Windows)
.\venv\Scripts\activate
# Activate venv (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (optional: add your Gnani and Gemini API keys)
cp .env.example .env

# Run FastAPI backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be running on `http://127.0.0.1:8000` (Interactive Swagger docs at `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser!

---

## 🐳 Docker Compose (1-Command Full Stack)

To run PostgreSQL, FastAPI, and Next.js in synchronized Docker containers:
```bash
docker compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

---

## 📖 Documentation & Guides

- **Architecture Deep-Dive**: See the live `/architecture` page inside the app.
- **Production Deployment Guide**: Read [`DEPLOYMENT.md`](./DEPLOYMENT.md) for step-by-step instructions for Vercel, Render, Railway, and VPS.
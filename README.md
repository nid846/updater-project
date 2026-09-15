# Developer Activity Tracker

A full-stack application that aggregates GitHub commit activity, caches frequent queries, persists history, and generates AI-powered summaries of developer activity and projects.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Ingestion
        A[GitHub Webhooks<br/>Real-time push events] --> C[Express.js Server]
        B[Daily Cron Job<br/>Scheduled fallback sync] --> C
    end

    subgraph Application & Services
        C --> D[GitHub REST API Service]
        C --> E[Hugging Face Inference API<br/>Gemma-3-27b]
    end

    subgraph Storage & Cache
        C <-->|Query / Store| F[(PostgreSQL Database)]
        C <-->|Get / Set with TTL| G[(Redis Cache)]
    end

    subgraph Presentation
        C --> H[EJS Server-Rendered Views]
    end
```

### Data Flow
1. **Ingestion**: Commit events are received either in real-time via GitHub Webhooks (`/github/webhook`) or on a scheduled daily schedule via `node-cron`.
2. **Storage & Cache**: Commits, developer summaries, and projects are persisted in PostgreSQL. Hot data (commit lists and summaries) is cached in Redis with TTLs to minimize external API requests.
3. **AI Summaries**: Commit logs are processed via Hugging Face Inference API (`google/gemma-3-27b-it`) to generate high-level technical overviews and project spotlights.
4. **Presentation**: Dynamic dashboards are rendered server-side using EJS and authenticated with session management.

---

## Live Deployment

- **Live URL**: [https://updater-project.onrender.com](https://updater-project.onrender.com) 

### Deployment Stack
| Component | Platform / Service |
| :--- | :--- |
| **Backend & Web Server** | Render (Node.js runtime) |
| **Database** | Managed PostgreSQL (Render Postgres) |
| **Cache** | Managed Redis (Upstash) |
| **AI Inference** | Hugging Face Serverless Inference API |

---

## Tech Stack

- **Runtime & Framework**: Node.js, Express.js (v5)
- **Templating**: EJS
- **Database**: PostgreSQL (`pg`)
- **Caching**: Redis
- **Background Jobs**: `node-cron`
- **AI Integration**: `@huggingface/inference`
- **Authentication**: `express-session`, `bcrypt`

---

## Local Development Setup

### 1. Prerequisites
- Node.js (>= 18.0.0)
- PostgreSQL database
- Redis instance (local or cloud)
- GitHub Personal Access Token (PAT)
- Hugging Face API Token

### 2. Installation
```bash
git clone https://github.com/your-username/updater-project.git
cd updater-project
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_session_secret_key

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
WEBHOOK_SECRET=your_github_webhook_secret

# Database & Cache
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379

# AI Service
HF_API_KEY=your_huggingface_api_token
```

### 4. Initialize Database & Run
```bash
# Create necessary tables
npm run db:init

# Start application server
npm start
```

The application will be accessible at `http://localhost:3000`.

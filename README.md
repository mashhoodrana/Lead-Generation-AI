# 🎯 LeadHunter AI — B2B Intelligence Engine

> **GenAI Zürich Hackathon 2026** — Apify Challenge Submission  
> Built by [@mashhoodrana](https://github.com/mashhoodrana)

---

## What Is This?

LeadHunter AI is a **live B2B intelligence engine** that replaces manual prospect research. You give it any company name and URL — it scrapes the entire web in real time using Apify, then an LLM synthesizes everything into a complete sales intelligence brief. Then you can **chat with the intelligence** to ask follow-up questions.

**The problem it solves:**  
Sales reps spend 3–5 hours manually researching prospects before writing outreach. Tools like Apollo and ZoomInfo give you static databases that go stale. LeadHunter AI gives you **live, fresh intelligence in 60 seconds** — scraped right now, not last month.

**What makes it different from every existing tool:**  
Nobody lets you *chat* with your prospect intelligence. You don't get a PDF report — you get an AI analyst that knows everything about the company and answers your follow-up questions instantly.

---

## Live Demo

> Enter any company → watch it scrape live → get full intelligence brief → chat with it

**Demo companies to try:**
- `Notion` → `https://notion.so`
- `Linear` → `https://linear.app`
- `Vercel` → `https://vercel.com`

---

## What The AI Extracts

| Category | What You Get |
|---|---|
| 🏢 **Company Overview** | What they do, business model, size, industry |
| 🛠 **Tech Stack** | Technologies detected from their site |
| ⚔️ **Competitors** | Who they compete with |
| ⚡ **Pain Points** | Likely internal challenges |
| 🟢 **Buying Signals** | Trigger events that make them likely to buy now |
| 💰 **Pricing Intelligence** | Pricing model, tiers, signals from their site |
| 🔍 **SEO & Content Signals** | Keyword strategy, content gaps, what they publish about |
| 🎯 **Messaging Weaknesses** | Gaps in their positioning you can exploit |
| 💬 **Customer Complaints** | What real customers say on review sites |
| 📰 **Recent News** | Latest announcements, partnerships, funding |
| ✉️ **Cold Email** | Personalized outreach email for any target role |
| 💼 **LinkedIn DM** | Short LinkedIn connection message |
| 🤖 **AI Chat** | Ask anything — pricing, SEO, positioning, write a DM |

---

## Architecture

```
┌─────────────────────────────────────┐
│         React + Tailwind UI          │
│   Two-column: Results + Chat panel  │
└──────────────────┬──────────────────┘
                   │ HTTP POST
┌──────────────────▼──────────────────┐
│          Python FastAPI              │
│     Orchestrates Actor calls        │
└──┬──────────────┬────────────────┬──┘
   │              │                │
   ▼              ▼                ▼
apify/         apify/          apify/
rag-web-       website-        rag-web-
browser        content-        browser
(web search    crawler         (news search)
+ scraping)    (site crawl)
                    │
                    ▼
            OpenRouter LLM
         (claude-3-haiku via
          Apify OpenRouter proxy)
                    │
                    ▼
         Structured JSON Brief
         + Personalized Outreach
```

**Key Design Decisions:**
- All 3 Apify Actors run in **parallel** using `asyncio.gather()` — minimizing total scrape time
- Memory capped at **1024MB per sub-Actor** to stay within free tier limits
- LLM prompt engineered to return **strict JSON** — no parsing failures
- Chat endpoint reuses the scraped context — no re-scraping needed for follow-ups

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS (CDN) |
| Backend | Python FastAPI + Uvicorn |
| Scraping | Apify Platform (`apify/rag-web-browser`, `apify/website-content-crawler`) |
| LLM | Claude 3 Haiku via OpenRouter API |
| Actor SDK | `apify-client` Python SDK |
| Deployment | Apify Platform (Actor) |

---

## Apify Integration

This project uses **3 Apify Actors** in a single pipeline:

1. **`apify/rag-web-browser`** (Standby Actor)  
   Used twice in parallel — once for general company research, once for news/recent announcements. Returns clean Markdown from Google Search results.

2. **`apify/website-content-crawler`**  
   Deep crawls the company's official website (up to 3 pages). Extracts pricing pages, about pages, product descriptions.

3. **Published Actor: `mashhoodrana/leadhunter-ai`**  
   The core intelligence Actor packaged and published on Apify Store. Accepts `companyName`, `companyUrl`, `targetRole`, `openrouterApiKey` as input. Returns full structured JSON intelligence brief.

---

## Project Structure

```
Lead-Generation-AI/
├── leadhunter-actor/          # Published Apify Actor
│   ├── .actor/
│   │   ├── actor.json         # Actor metadata
│   │   └── input_schema.json  # Input validation schema
│   ├── my_actor/
│   │   └── main.py            # Core scraping + LLM logic
│   ├── Dockerfile
│   └── requirements.txt
│
├── backend/                   # FastAPI server
│   ├── main.py                # API routes + chat endpoint
│   └── requirements.txt
│
├── frontend/                  # React UI
│   ├── src/
│   │   ├── App.jsx            # Full UI — two-column layout
│   │   └── index.css
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## Setup & Run Locally

### Prerequisites
- Node.js 18+
- Python 3.10+
- Apify account with API token ([get free $100 credits](https://console.apify.com/sign-up) — promo: `GENAIHACKER`)
- OpenRouter API key ([openrouter.ai](https://openrouter.ai))

### 1. Clone the repo
```bash
git clone https://github.com/mashhoodrana/Lead-Generation-AI.git
cd Lead-Generation-AI
```

### 2. Run the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1      # Windows
# source venv/bin/activate       # Mac/Linux

pip install fastapi "uvicorn[standard]" apify-client python-dotenv httpx pydantic
```

Create `backend/.env`:
```
APIFY_TOKEN=your_apify_token_here
OPENROUTER_API_KEY=your_openrouter_key_here
ACTOR_ID=mashhoodrana/leadhunter-ai
```

```bash
python -m uvicorn main:app --port 8000
```

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

### 4. (Optional) Deploy your own Actor
```bash
cd leadhunter-actor
npm install -g apify-cli
apify login
apify push
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/analyze` | Run full intelligence scan |
| `POST` | `/api/chat` | Chat with scraped intelligence |

### POST `/api/analyze`
```json
{
  "companyName": "Notion",
  "companyUrl": "https://notion.so",
  "targetRole": "Head of Engineering"
}
```

### POST `/api/chat`
```json
{
  "question": "What's their pricing strategy?",
  "context": "<stringified intelligence brief>"
}
```

---

## The Actor on Apify Store

The core intelligence engine is published as a standalone Actor:  
**`mashhoodrana/leadhunter-ai`**

Anyone can call it via the Apify API:
```bash
curl -X POST https://api.apify.com/v2/acts/mashhoodrana~leadhunter-ai/runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Notion",
    "companyUrl": "https://notion.so",
    "targetRole": "VP of Sales",
    "openrouterApiKey": "YOUR_OPENROUTER_KEY"
  }'
```

---

## Why This Wins

| Existing Tools | LeadHunter AI |
|---|---|
| Static database (stale data) | Live scraping every time |
| No website behavior analysis | Crawls pricing, SEO, content |
| No conversational interface | Chat with your intelligence |
| $200–500/month | Free + open source |
| Generic templates | Role-specific personalized outreach |
| Report you read once | Analyst you can interrogate |

---

## Hackathon Challenge

**Challenge:** Apify — GenAI Zürich Hackathon 2026  
**Track:** Industry-agnostic  
**Solution path:** AI Agent + RAG Application + Published Actor  
**Apify integration depth:** 3 Actors used, 1 Actor published

---

## License

MIT — use it, fork it, build on it.
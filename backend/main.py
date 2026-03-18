from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from apify_client import ApifyClient
import os
from dotenv import load_dotenv
import httpx
import asyncio

load_dotenv()

app = FastAPI(title="LeadHunter AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

APIFY_TOKEN = os.getenv("APIFY_TOKEN")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
ACTOR_ID = os.getenv("ACTOR_ID", "YOUR_USERNAME/leadhunter-ai")


class LeadRequest(BaseModel):
    companyName: str
    companyUrl: str
    targetRole: str = "Head of Engineering"


@app.get("/health")
def health():
    return {"status": "ok", "actor": ACTOR_ID}


@app.post("/api/analyze")
async def analyze_company(req: LeadRequest):
    """Trigger Actor and wait for results."""
    if not APIFY_TOKEN:
        raise HTTPException(500, "APIFY_TOKEN not configured")

    client = ApifyClient(APIFY_TOKEN)

    try:
        run = client.actor(ACTOR_ID).call(
            run_input={
                "companyName": req.companyName,
                "companyUrl": req.companyUrl,
                "targetRole": req.targetRole,
                "openrouterApiKey": OPENROUTER_KEY,
            },
            timeout_secs=300,
        )

        items = list(
            client.dataset(run["defaultDatasetId"]).iterate_items()
        )

        if not items:
            raise HTTPException(500, "Actor returned no results")

        return {"status": "success", "data": items[0]}

    except Exception as e:
        raise HTTPException(500, f"Actor run failed: {str(e)}")


@app.get("/api/run/{run_id}/status")
def get_run_status(run_id: str):
    """Check status of a running Actor."""
    client = ApifyClient(APIFY_TOKEN)
    run = client.run(run_id).get()
    return {
        "status": run.get("status"),
        "statusMessage": run.get("statusMessage"),
    }

class ChatRequest(BaseModel):
    question: str
    context: str

@app.post("/api/chat")
async def chat_with_intel(req: ChatRequest):
    """Chat with the intelligence brief using OpenRouter."""
    
    prompt = f"""You are a B2B sales intelligence assistant. 
You have already researched a company and gathered this intelligence:

{req.context}

Now answer this sales rep's question concisely and practically:
{req.question}

Be specific, actionable, and reference the actual company data above.
Keep response under 100 words unless writing a message/email."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "anthropic/claude-3-haiku",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
                "max_tokens": 300
            },
            timeout=30.0
        )
        data = response.json()
    
    answer = data["choices"][0]["message"]["content"]
    return {"answer": answer}
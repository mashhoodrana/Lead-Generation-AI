"""
LeadHunter AI Actor
Scrapes live web data about a company and generates 
a B2B intelligence brief + personalized outreach email.
"""

import os
import asyncio
import json
import httpx
from apify import Actor


async def search_web_for_company(apify_token: str, query: str) -> str:
    """Use Apify RAG Web Browser to search and scrape."""
    from apify_client import ApifyClient
    
    client = ApifyClient(apify_token)
    
    Actor.log.info(f"Searching web for: {query}")
    
    run = client.actor("apify/rag-web-browser").call(
        run_input={
            "query": query,
            "maxResults": 2,
            "outputFormats": ["markdown"]
        },
        memory_mbytes=1024
    )
    
    # Get results from dataset
    results = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        if item.get("markdown"):
            results.append(item["markdown"][:2000])  # Cap per source
    
    return "\n\n---\n\n".join(results) if results else "No results found."


async def crawl_company_website(apify_token: str, url: str) -> str:
    """Use Website Content Crawler to get company site content."""
    from apify_client import ApifyClient
    
    client = ApifyClient(apify_token)
    
    Actor.log.info(f"Crawling website: {url}")
    
    run = client.actor("apify/website-content-crawler").call(
        run_input={
            "startUrls": [{"url": url}],
            "maxCrawlPages": 3,
            "crawlerType": "cheerio",
            "outputFormats": ["markdown"]
        },
        memory_mbytes=1024
    )
    
    results = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        if item.get("markdown"):
            results.append(item["markdown"][:1500])
    
    return "\n\n---\n\n".join(results[:3]) if results else "Could not crawl website."


async def generate_intelligence_brief(
    openrouter_key: str,
    company_name: str,
    target_role: str,
    web_data: str,
    site_data: str
) -> dict:
    """Call OpenRouter LLM to synthesize intelligence brief."""
    
    Actor.log.info("Generating AI intelligence brief...")
    
    prompt = f"""You are a B2B sales intelligence analyst with deep expertise in competitive strategy. 
        Analyze ALL the following live web data about {company_name} and generate a comprehensive intelligence brief.

        WEB SEARCH DATA:
        {web_data[:3000]}

        COMPANY WEBSITE DATA:
        {site_data[:2000]}

        Generate a JSON response with EXACTLY this structure:
        {{
        "company_overview": "2-3 sentence summary",
        "company_size": "startup/SMB/mid-market/enterprise",
        "industry": "primary industry",
        "business_model": "how they make money - SaaS/marketplace/services/ecommerce etc",
        "tech_stack": ["tech1", "tech2", "tech3"],
        "pricing_intelligence": {{
            "model": "freemium/subscription/one-time/usage-based/custom",
            "tiers": ["tier description 1", "tier description 2"],
            "price_signals": "any pricing signals found on website"
        }},
        "seo_signals": {{
            "content_focus": "what topics they publish about",
            "keyword_strategy": "what keywords they seem to target",
            "content_gaps": "topics they are NOT covering that competitors might"
        }},
        "recent_news": ["development 1", "development 2"],
        "competitors": ["competitor1", "competitor2", "competitor3"],
        "customer_pain_points": ["what their customers complain about based on reviews/web data"],
        "sales_triggers": ["trigger event that makes them likely to buy now 1", "trigger 2"],
        "pain_points": ["pain point 1", "pain point 2", "pain point 3"],
        "key_differentiators": ["differentiator 1", "differentiator 2"],
        "messaging_weaknesses": ["gap in their messaging 1", "gap 2"],
        "outreach_email": {{
            "subject": "compelling subject line",
            "body": "personalized 3-paragraph email for {target_role}. Reference specific company details. Under 150 words. No fluff."
        }},
        "linkedin_message": "short 3-sentence LinkedIn connection message for {target_role}",
        "confidence_score": 85,
        "scraped_context": "summary of what data was successfully found"
        }}

        Return ONLY valid JSON. No markdown, no explanation."""

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {openrouter_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://leadhunter-ai.apify.actor",
                "X-Title": "LeadHunter AI"
            },
            json={
                "model": "anthropic/claude-3-haiku",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 1500
            },
            timeout=60.0
        )
        response.raise_for_status()
        data = response.json()
    
    content = data["choices"][0]["message"]["content"]
    
    # Clean and parse JSON
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    
    return json.loads(content)


async def main():
    async with Actor:
        # ── 1. Get input ──────────────────────────────────────────
        input_data = await Actor.get_input() or {}
        
        company_name = input_data.get("companyName", "")
        company_url = input_data.get("companyUrl", "")
        target_role = input_data.get("targetRole", "Head of Engineering")
        openrouter_key = input_data.get("openrouterApiKey", "")
        
        if not company_name or not company_url or not openrouter_key:
            await Actor.fail("Missing required inputs: companyName, companyUrl, openrouterApiKey")
            return
        
        apify_token = input_data.get("apifyToken") or os.environ.get("APIFY_TOKEN", "")
        
        # ── 2. Update status ──────────────────────────────────────
        await Actor.set_status_message(f"🔍 Researching {company_name}...")
        
        # ── 3. Scrape web data in parallel ────────────────────────
        web_query = f"{company_name} company overview product funding news 2024 2025"
        news_query = f"{company_name} recent news announcement partnership 2025"
        
        web_data_task = search_web_for_company(apify_token, web_query)
        news_data_task = search_web_for_company(apify_token, news_query)
        site_data_task = crawl_company_website(apify_token, company_url)
        
        await Actor.set_status_message("🌐 Scraping web data with Apify...")
        
        web_data, news_data, site_data = await asyncio.gather(
            web_data_task,
            news_data_task,
            site_data_task,
            return_exceptions=True
        )
        
        # Handle errors gracefully
        if isinstance(web_data, Exception):
            Actor.log.warning(f"Web search failed: {web_data}")
            web_data = ""
        if isinstance(news_data, Exception):
            Actor.log.warning(f"News search failed: {news_data}")
            news_data = ""
        if isinstance(site_data, Exception):
            Actor.log.warning(f"Site crawl failed: {site_data}")
            site_data = ""
        
        combined_web_data = f"{web_data}\n\n{news_data}"
        
        # ── 4. Generate AI brief ──────────────────────────────────
        await Actor.set_status_message("🤖 Generating AI intelligence brief...")
        
        try:
            brief = await generate_intelligence_brief(
                openrouter_key,
                company_name,
                target_role,
                combined_web_data,
                site_data
            )
        except Exception as e:
            Actor.log.error(f"LLM generation failed: {e}")
            brief = {
                "company_overview": f"Intelligence gathering completed for {company_name}",
                "error": str(e)
            }
        
        # ── 5. Push final output ──────────────────────────────────
        output = {
            "company_name": company_name,
            "company_url": company_url,
            "target_role": target_role,
            **brief,
            "data_sources": {
                "web_search": len(web_data) > 0,
                "news_search": len(news_data) > 0,
                "website_crawl": len(site_data) > 0
            }
        }
        
        await Actor.push_data(output)
        await Actor.set_status_message(f"✅ Intelligence brief ready for {company_name}!")
        
        Actor.log.info("LeadHunter AI completed successfully")


asyncio.run(main())
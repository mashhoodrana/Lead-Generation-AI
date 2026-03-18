import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

function Badge({ text, color = "slate" }) {
  const colors = {
    slate: "bg-slate-800 text-slate-300 border-slate-700",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/25",
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/25",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs border font-medium ${colors[color]}`}
    >
      {text}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ListItems({ items, iconColor = "text-slate-500", icon = "›" }) {
  if (!items || items.length === 0)
    return <p className="text-xs text-slate-600">No data found.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-300">
          <span className={`${iconColor} shrink-0 mt-0.5`}>{icon}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ChatPanel({ data, API }) {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const send = async (override) => {
    const q = override || input;
    if (!q.trim() || loading) return;
    setInput("");
    setChat((p) => [...p, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/chat`, {
        question: q,
        context: JSON.stringify(data),
      });
      setChat((p) => [...p, { role: "ai", text: res.data.answer }]);
    } catch {
      setChat((p) => [...p, { role: "ai", text: "Error — please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "What's their pricing strategy?",
    "How is their SEO?",
    "What's their biggest weakness?",
    "Write a LinkedIn DM",
    "How to position against them?",
    "What do customers complain about?",
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-800 shrink-0">
        <p className="text-xs font-semibold text-slate-300">AI Analyst Chat</p>
        <p className="text-xs text-slate-600 mt-0.5">
          Ask anything about {data.company_name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {chat.length === 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-600 px-1 mb-2">Try asking:</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-800/60
                           text-slate-400 border border-slate-700/40 hover:border-slate-600
                           hover:text-slate-300 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700/50 px-3 py-2.5 rounded-lg">
              <div className="flex gap-1 items-center">
                <span
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask anything..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                       text-xs text-white placeholder-slate-600 focus:outline-none
                       focus:border-slate-600 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500
                       disabled:opacity-30 text-white text-xs font-bold transition-colors"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ data }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLinkedIn, setCopiedLinkedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "intelligence", label: "Intelligence" },
    { id: "outreach", label: "Outreach" },
  ];

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Company header */}
      <div className="px-5 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500
                            flex items-center justify-center text-white text-sm font-bold shrink-0"
            >
              {data.company_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-none">
                {data.company_name}
              </h2>
              <a
                href={data.company_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                {data.company_url}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.company_size && (
              <Badge text={data.company_size} color="cyan" />
            )}
            {data.industry && <Badge text={data.industry} color="violet" />}
            {data.business_model && (
              <Badge text={data.business_model} color="amber" />
            )}
            {data.confidence_score && (
              <Badge
                text={`${data.confidence_score}% confident`}
                color="emerald"
              />
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-5 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs py-2.5 px-3 mr-2 border-b-2 transition-colors font-medium ${
              activeTab === tab.id
                ? "border-violet-500 text-white"
                : "border-transparent text-slate-600 hover:text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <>
            <Section title="What They Do">
              <p className="text-sm text-slate-300 leading-relaxed">
                {data.company_overview}
              </p>
              {data.business_model && (
                <p className="text-xs text-slate-600 mt-2">
                  Model:{" "}
                  <span className="text-slate-400">{data.business_model}</span>
                </p>
              )}
            </Section>

            <Section title="Tech Stack">
              <div className="flex flex-wrap gap-1.5">
                {(data.tech_stack || []).map((t, i) => (
                  <Badge key={i} text={t} color="violet" />
                ))}
              </div>
            </Section>

            <Section title="Competitors">
              <div className="flex flex-wrap gap-1.5">
                {(data.competitors || []).map((c, i) => (
                  <Badge key={i} text={c} color="rose" />
                ))}
              </div>
            </Section>

            <Section title="Recent News">
              <ListItems
                items={data.recent_news}
                iconColor="text-emerald-500"
                icon="•"
              />
            </Section>

            <Section title="Data Sources">
              <div className="flex gap-2 flex-wrap">
                {data.data_sources?.web_search && (
                  <Badge text="Web Search" color="emerald" />
                )}
                {data.data_sources?.news_search && (
                  <Badge text="News Scrape" color="emerald" />
                )}
                {data.data_sources?.website_crawl && (
                  <Badge text="Site Crawl" color="emerald" />
                )}
              </div>
            </Section>
          </>
        )}

        {/* INTELLIGENCE */}
        {activeTab === "intelligence" && (
          <>
            <Section title="Pain Points">
              <ListItems
                items={data.pain_points}
                iconColor="text-rose-400"
                icon="→"
              />
            </Section>

            <Section title="Buying Signals">
              <ListItems
                items={data.sales_triggers || data.buying_signals}
                iconColor="text-emerald-400"
                icon="↑"
              />
            </Section>

            {data.pricing_intelligence && (
              <Section title="Pricing Intelligence">
                <div className="space-y-2.5">
                  {data.pricing_intelligence.model && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-amber-400 text-xs uppercase tracking-wide w-16 shrink-0 mt-0.5">
                        Model
                      </span>
                      <span className="text-slate-300">
                        {data.pricing_intelligence.model}
                      </span>
                    </div>
                  )}
                  {data.pricing_intelligence.price_signals && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-amber-400 text-xs uppercase tracking-wide w-16 shrink-0 mt-0.5">
                        Signals
                      </span>
                      <span className="text-slate-300">
                        {data.pricing_intelligence.price_signals}
                      </span>
                    </div>
                  )}
                  {(data.pricing_intelligence.tiers || []).length > 0 && (
                    <ListItems
                      items={data.pricing_intelligence.tiers}
                      iconColor="text-amber-400"
                      icon="•"
                    />
                  )}
                </div>
              </Section>
            )}

            {data.seo_signals && (
              <Section title="SEO & Content Intelligence">
                <div className="space-y-2.5">
                  {data.seo_signals.content_focus && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-cyan-400 text-xs uppercase tracking-wide w-16 shrink-0 mt-0.5">
                        Focus
                      </span>
                      <span className="text-slate-300">
                        {data.seo_signals.content_focus}
                      </span>
                    </div>
                  )}
                  {data.seo_signals.keyword_strategy && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-cyan-400 text-xs uppercase tracking-wide w-16 shrink-0 mt-0.5">
                        Keywords
                      </span>
                      <span className="text-slate-300">
                        {data.seo_signals.keyword_strategy}
                      </span>
                    </div>
                  )}
                  {data.seo_signals.content_gaps && (
                    <div className="flex gap-2 text-sm">
                      <span className="text-cyan-400 text-xs uppercase tracking-wide w-16 shrink-0 mt-0.5">
                        Gaps
                      </span>
                      <span className="text-slate-300">
                        {data.seo_signals.content_gaps}
                      </span>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {data.messaging_weaknesses &&
              data.messaging_weaknesses.length > 0 && (
                <Section title="Messaging Weaknesses">
                  <ListItems
                    items={data.messaging_weaknesses}
                    iconColor="text-rose-400"
                    icon="✗"
                  />
                </Section>
              )}

            {data.customer_pain_points &&
              data.customer_pain_points.length > 0 && (
                <Section title="What Customers Complain About">
                  <ListItems
                    items={data.customer_pain_points}
                    iconColor="text-violet-400"
                    icon="→"
                  />
                </Section>
              )}

            <Section title="Key Differentiators">
              <ListItems
                items={data.key_differentiators}
                iconColor="text-cyan-400"
                icon="★"
              />
            </Section>
          </>
        )}

        {/* OUTREACH */}
        {activeTab === "outreach" && (
          <>
            {data.outreach_email && (
              <Section title={`Cold Email → ${data.target_role}`}>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() =>
                      copy(
                        `Subject: ${data.outreach_email.subject}\n\n${data.outreach_email.body}`,
                        setCopiedEmail,
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400
                               border border-slate-700 hover:text-slate-300 hover:border-slate-600 transition-colors"
                  >
                    {copiedEmail ? "✓ Copied!" : "Copy Email"}
                  </button>
                </div>
                <div className="bg-slate-950 rounded-lg p-4 space-y-3 border border-slate-800">
                  <p className="text-xs">
                    <span className="text-slate-600">Subject: </span>
                    <span className="text-slate-200 font-medium">
                      {data.outreach_email.subject}
                    </span>
                  </p>
                  <hr className="border-slate-800" />
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {data.outreach_email.body}
                  </p>
                </div>
              </Section>
            )}

            {data.linkedin_message && (
              <Section title={`LinkedIn DM → ${data.target_role}`}>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() =>
                      copy(data.linkedin_message, setCopiedLinkedIn)
                    }
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400
                               border border-slate-700 hover:text-slate-300 hover:border-slate-600 transition-colors"
                  >
                    {copiedLinkedIn ? "✓ Copied!" : "Copy DM"}
                  </button>
                </div>
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {data.linkedin_message}
                  </p>
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingPulse({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <div
          className="absolute inset-1.5 rounded-full border-2 border-cyan-400 border-b-transparent animate-spin"
          style={{ animationDirection: "reverse" }}
        />
      </div>
      <p className="text-slate-600 text-xs">{message}</p>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState({
    companyName: "",
    companyUrl: "",
    targetRole: "Head of Engineering",
  });
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadingMessages = [
    "Searching the web...",
    "Crawling company website...",
    "Gathering news & signals...",
    "Analyzing pricing & SEO...",
    "Synthesizing intelligence...",
    "Crafting outreach messages...",
  ];

  const handleSubmit = async () => {
    if (!form.companyName || !form.companyUrl) return;
    setLoading(true);
    setResult(null);
    setError(null);
    let i = 0;
    setLoadingMsg(loadingMessages[0]);
    const iv = setInterval(() => {
      i = (i + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[i]);
    }, 4000);
    try {
      const res = await axios.post(`${API}/api/analyze`, form);
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#080810] text-slate-300"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Top bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500
                            flex items-center justify-center text-white font-bold text-xs"
            >
              L
            </div>
            <span className="font-semibold text-white text-sm">
              LeadHunter <span className="text-violet-400">AI</span>
            </span>
            <span className="text-slate-700 text-xs hidden md:inline">
              — B2B Intelligence Engine
            </span>
          </div>
          <div className="flex items-center gap-4">
            {result && (
              <button
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="text-xs text-slate-600 hover:text-slate-300 transition-colors"
              >
                ← New Search
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Powered by Apify
            </div>
          </div>
        </div>
      </div>

      {/* Landing / Search */}
      {!result && (
        <div className="max-w-xl mx-auto px-6 py-16">
          {!loading && (
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                              bg-violet-500/10 border border-violet-500/20 text-violet-400
                              text-xs mb-5 font-medium"
              >
                GenAI Zürich Hackathon 2026
              </div>
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight leading-tight">
                B2B Intelligence
                <br />
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  in 60 seconds
                </span>
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Live web scraping via Apify. Pricing intel, SEO analysis,
                competitor mapping, and an AI analyst you can chat with.
              </p>
            </div>
          )}

          {loading ? (
            <div className="border border-slate-800 rounded-2xl bg-slate-900/40">
              <LoadingPulse message={loadingMsg} />
            </div>
          ) : (
            <>
              <div className="border border-slate-800 rounded-2xl p-5 bg-slate-900/40 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 uppercase tracking-widest block mb-1.5">
                      Company *
                    </label>
                    <input
                      value={form.companyName}
                      onChange={(e) =>
                        setForm({ ...form, companyName: e.target.value })
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="Notion"
                      className="w-full bg-slate-800/70 border border-slate-700/70 rounded-lg px-3 py-2.5
                                 text-white placeholder-slate-600 text-sm focus:outline-none
                                 focus:border-slate-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 uppercase tracking-widest block mb-1.5">
                      Target Role
                    </label>
                    <input
                      value={form.targetRole}
                      onChange={(e) =>
                        setForm({ ...form, targetRole: e.target.value })
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="Head of Engineering"
                      className="w-full bg-slate-800/70 border border-slate-700/70 rounded-lg px-3 py-2.5
                                 text-white placeholder-slate-600 text-sm focus:outline-none
                                 focus:border-slate-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-600 uppercase tracking-widest block mb-1.5">
                    Website URL *
                  </label>
                  <input
                    value={form.companyUrl}
                    onChange={(e) =>
                      setForm({ ...form, companyUrl: e.target.value })
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="https://notion.so"
                    className="w-full bg-slate-800/70 border border-slate-700/70 rounded-lg px-3 py-2.5
                               text-white placeholder-slate-600 text-sm focus:outline-none
                               focus:border-slate-500 transition-colors"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!form.companyName || !form.companyUrl}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm text-white
                             bg-gradient-to-r from-violet-600 to-cyan-600
                             hover:from-violet-500 hover:to-cyan-500
                             disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                >
                  Run Intelligence Scan →
                </button>
              </div>
              <div className="flex justify-center gap-5 mt-5 text-xs text-slate-700">
                <span>✓ Live scraping</span>
                <span>✓ Pricing signals</span>
                <span>✓ SEO analysis</span>
                <span>✓ AI chat</span>
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 border border-rose-800/40 bg-rose-950/20 rounded-xl p-4 text-rose-400 text-sm">
              ❌ {error}
            </div>
          )}
        </div>
      )}

      {/* Two-column results layout */}
      {result && (
        <div
          className="max-w-screen-xl mx-auto px-4 pb-4 pt-3"
          style={{ height: "calc(100vh - 49px)" }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
            {/* LEFT — Intelligence results */}
            <div
              className="lg:col-span-2 border border-slate-800 rounded-xl
                            bg-slate-900/20 overflow-hidden flex flex-col"
            >
              <ResultsPanel data={result} />
            </div>

            {/* RIGHT — Chat pinned */}
            <div
              className="border border-slate-800 rounded-xl
                            bg-slate-900/20 overflow-hidden flex flex-col"
            >
              <ChatPanel data={result} API={API} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

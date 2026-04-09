// ── Serper search helper ──
async function serperSearch(query, apiKey, num = 5) {
  try {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify({ q: query, num, hl: 'en', gl: 'us' })
    });
    const d = await r.json();
    return (d.organic || []).slice(0, num).map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet || ''
    }));
  } catch (e) {
    return [];
  }
}

function fmt(results) {
  if (!results.length) return '(no results)';
  return results.map((r, i) =>
    `${i+1}. [${r.title}](${r.url})\n   ${r.snippet}`
  ).join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { lang = 'zh', depth = '标准', topic = '' } = req.body || {};
  const SERPER_KEY = process.env.SERPER_API_KEY;
  const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });

  const builders = [
    { name: 'Andrej Karpathy', url: 'https://x.com/karpathy', role: 'Tesla former AI Director' },
    { name: 'Sam Altman',      url: 'https://x.com/sama',       role: 'OpenAI CEO' },
    { name: 'Amanda Askell',   url: 'https://x.com/AmandaAskell', role: 'Anthropic Researcher' },
    { name: 'Alex Albert',     url: 'https://x.com/alexalbert__', role: 'Anthropic' },
    { name: 'Amjad Masad',     url: 'https://x.com/amasad',     role: 'Replit CEO' },
    { name: 'Guillermo Rauch', url: 'https://x.com/rauchg',     role: 'Vercel CEO' },
    { name: 'Swyx',            url: 'https://x.com/swyx',       role: 'AI Engineer / Latent Space' },
    { name: 'Dan Shipper',     url: 'https://x.com/danshipper', role: 'Every.to CEO' },
    { name: 'Hamel Husain',    url: 'https://x.com/HamelHusain', role: 'AI Engineer' },
    { name: 'Garry Tan',       url: 'https://x.com/garrytan',   role: 'YC CEO' },
    { name: 'Matt Turck',      url: 'https://x.com/mattturck',  role: 'FirstMark Capital' },
    { name: 'Kevin Weil',      url: 'https://x.com/kevinweil',  role: 'OpenAI CPO' },
    { name: 'Aaron Levie',     url: 'https://x.com/levie',      role: 'Box CEO' },
    { name: 'Peter Steinberger', url: 'https://x.com/steipete', role: 'AI Tools Builder' },
    { name: 'Zara Zhang',      url: 'https://x.com/zarazhangrui', role: 'follow-builders author' },
  ];

  const podcasts = [
    { name: 'Latent Space',       url: 'https://www.youtube.com/@LatentSpacePod' },
    { name: 'No Priors',          url: 'https://www.youtube.com/@NoPriorsPodcast' },
    { name: "Lenny's Podcast",    url: 'https://www.youtube.com/@LennysPodcast' },
    { name: 'Training Data',      url: 'https://www.youtube.com/playlist?list=PLOhHNjZItNnMm5tdW61JpnyxeYH5NDDx8' },
    { name: 'Unsupervised Learning', url: 'https://www.youtube.com/@RedpointAI' },
  ];

  // ── Step 1: Parallel Serper searches ──
  const topicQ = topic ? ` ${topic}` : '';
  const searchQueries = [
    `AI builders${topicQ} latest news ${today}`,
    `LLM agents${topicQ} developments 2026`,
    `Anthropic OpenAI${topicQ} AI research ${today}`,
    `AI engineering${topicQ} best articles 2026`,
  ];

  let searchResults = [];
  if (SERPER_KEY) {
    const searches = await Promise.all(
      searchQueries.map(q => serperSearch(q, SERPER_KEY, 4))
    );
    searchResults = searches.flat();
    // Deduplicate by URL
    const seen = new Set();
    searchResults = searchResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }

  const langInstructions = {
    zh: `输出语言：中文。所有正文、标题、板块名称全部用中文。技术专有名词保留英文（LLM、MCP、RAG 等）。`,
    en: `Output language: English. All body text, headings, and section titles in English.`,
    de: `Ausgabesprache: Deutsch. Alle Texte und Abschnittstitel auf Deutsch. Technische Fachbegriffe können auf Englisch bleiben.`,
  };

  const depthMap = {
    '标准': 'Each section: 120–160 words.',
    '深度': 'Each section: 280–350 words with deep analysis of underlying logic and implications.',
    '精简': 'Output ONLY the Top Highlights section (3 items, 2 sentences each). Skip all other sections.',
  };

  const topicNote = topic ? `Special focus on: "${topic}" — emphasise this topic throughout.` : '';

  const builderRef = builders.map(b => `${b.name} <${b.url}> (${b.role})`).join('\n');
  const podcastRef = podcasts.map(p => `${p.name} <${p.url}>`).join('\n');
  const realLinks = searchResults.length
    ? `\nREAL SEARCH RESULTS FROM TODAY (use these URLs — they are verified and accessible):\n${fmt(searchResults)}\n`
    : '';

  const prompt = `You are an expert AI content curator following the "Follow Builders, Not Influencers" philosophy.
Today is ${today}.

${langInstructions[lang] || langInstructions.zh}
${depthMap[depth] || depthMap['标准']}
${topicNote}
${realLinks}

CITATION RULES (strictly enforced):
1. Every person mentioned → hyperlink to their X profile: [Name](x_url)
2. Every podcast mentioned → hyperlink to YouTube: [Podcast](youtube_url)
3. For "This Week's Reads": ONLY use URLs from the Real Search Results above. Do NOT invent URLs.
   Format each as: [Article Title](real_url) — one sentence why it matters
4. For all other sections: cite sources inline as ——[Source Name](url)
5. If no real search results are available, omit the Reads section entirely rather than inventing links.

Builder reference (use exact URLs):
${builderRef}

Podcast reference (use exact URLs):
${podcastRef}

Generate digest in this exact structure. Translate ALL section headers to the output language:

### 🔥 [Today's Highlights / 今日要点 / Top-Highlights]
1. **[Person](x_url)** — [insight] ——[Source](url)
2. **[Person](x_url)** — [insight] ——[Source](url)
3. **[Person](x_url)** — [insight] ——[Source](url)

---

### 🧠 [Builder Insights / Builder 洞察 / Builder-Einblicke]

**X / Twitter**
[2–3 insights from builder list. Each person linked. Each claim sourced.]

**Podcasts / 播客 / Podcasts**
[1–2 podcast highlights. Show name linked. Key takeaways cited.]

---

### 💡 [Deep Dive / 深度解析 / Tiefenanalyse]
[The most significant idea this week. Underlying logic. Why it matters. Min 2 cited sources.]

---

### 🔗 [This Week's Reads / 本周精读 / Woche-Lektüre]
[Use ONLY real URLs from search results above. Skip this section if none available.]
- [Title](real_url) — [why it matters]
- [Title](real_url) — [why it matters]
- [Title](real_url) — [why it matters]

---

### 📌 [Signal vs. Noise / 信号与噪音 / Signal vs. Rauschen]
[One paragraph. Real signal vs. hype this week. Be direct and opinionated.]`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Generation failed' });
    res.status(200).json({ result: d.content?.[0]?.text || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

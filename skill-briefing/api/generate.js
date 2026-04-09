export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { lang = 'zh', depth = '标准', topic = '' } = req.body || {};

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const builders = [
    { name: 'Andrej Karpathy', url: 'https://x.com/karpathy', role: 'Tesla former AI Director' },
    { name: 'Sam Altman', url: 'https://x.com/sama', role: 'OpenAI CEO' },
    { name: 'Amanda Askell', url: 'https://x.com/AmandaAskell', role: 'Anthropic Researcher' },
    { name: 'Alex Albert', url: 'https://x.com/alexalbert__', role: 'Anthropic' },
    { name: 'Amjad Masad', url: 'https://x.com/amasad', role: 'Replit CEO' },
    { name: 'Guillermo Rauch', url: 'https://x.com/rauchg', role: 'Vercel CEO' },
    { name: 'Swyx', url: 'https://x.com/swyx', role: 'AI Engineer / Latent Space' },
    { name: 'Dan Shipper', url: 'https://x.com/danshipper', role: 'Every.to CEO' },
    { name: 'Hamel Husain', url: 'https://x.com/HamelHusain', role: 'AI Engineer' },
    { name: 'Garry Tan', url: 'https://x.com/garrytan', role: 'YC CEO' },
    { name: 'Matt Turck', url: 'https://x.com/mattturck', role: 'FirstMark Capital' },
    { name: 'Kevin Weil', url: 'https://x.com/kevinweil', role: 'OpenAI CPO' },
    { name: 'Aaron Levie', url: 'https://x.com/levie', role: 'Box CEO' },
    { name: 'Peter Steinberger', url: 'https://x.com/steipete', role: 'PSPDFKit / AI Tools' },
    { name: 'Zara Zhang', url: 'https://x.com/zarazhangrui', role: 'AI Builder / follow-builders' },
  ];

  const podcasts = [
    { name: 'Latent Space', url: 'https://www.youtube.com/@LatentSpacePod' },
    { name: 'No Priors', url: 'https://www.youtube.com/@NoPriorsPodcast' },
    { name: "Lenny's Podcast", url: 'https://www.youtube.com/@LennysPodcast' },
    { name: 'Training Data', url: 'https://www.youtube.com/playlist?list=PLOhHNjZItNnMm5tdW61JpnyxeYH5NDDx8' },
    { name: 'Unsupervised Learning', url: 'https://www.youtube.com/@RedpointAI' },
  ];

  const langInstructions = {
    zh: `输出语言：中文。所有正文、标题、板块名称、描述全部用中文。技术专有名词保留英文（如 LLM、MCP、RAG）。来源标注格式：在句末加 ——[来源名称](url)。`,
    en: `Output language: English. All body text, headings, section titles, and descriptions in English. Source citation format: append ——[Source Name](url) at the end of each claim.`,
    de: `Ausgabesprache: Deutsch. Alle Texte, Überschriften, Abschnittstitel und Beschreibungen auf Deutsch. Technische Fachbegriffe können auf Englisch bleiben. Quellenformat: ——[Quellenname](url) am Ende jeder Aussage anhängen.`,
  };

  const depthMap = {
    '标准': 'Each section: 120–160 words.',
    '深度': 'Each section: 280–350 words with deep analysis of underlying logic and implications.',
    '精简': 'Output ONLY the Top Highlights section (3 items, 2 sentences each). Skip all other sections.',
  };

  const topicFocus = topic ? `Special focus: "${topic}" — weight this topic heavily across all sections.` : '';

  const builderRef = builders.map(b => `${b.name} <${b.url}> (${b.role})`).join('\n');
  const podcastRef = podcasts.map(p => `${p.name} <${p.url}>`).join('\n');

  const prompt = `You are an expert AI content curator following the "Follow Builders, Not Influencers" philosophy.
Today is ${today}.

${langInstructions[lang] || langInstructions.zh}
${depthMap[depth] || depthMap['标准']}
${topicFocus}

CRITICAL CITATION RULES — violations will make the digest useless:
1. EVERY person mentioned must be hyperlinked: [Name](their_x_url)
2. EVERY podcast mentioned must be hyperlinked: [Podcast Name](youtube_url)
3. EVERY factual claim or insight must end with a source citation: ——[Source](url)
4. For "This Week's Reads" items: the title itself must be a hyperlink [Title](url)
5. Never mention a builder or source without a URL. No exceptions.

Builder reference list (use these exact URLs):
${builderRef}

Podcast reference list (use these exact URLs):
${podcastRef}

Generate the digest in this exact structure. Translate ALL section headers and labels to the output language:

### 🔥 [Top Highlights / 今日要点 / Top-Highlights]
1. **[Person](url)** — [insight] ——[Source](url)
2. **[Person](url)** — [insight] ——[Source](url)
3. **[Person](url)** — [insight] ——[Source](url)

---

### 🧠 [Builder Insights / Builder 洞察 / Builder-Einblicke]

**[X/Twitter]**
[2–3 insights, each person linked, each claim sourced]

**[Podcasts / 播客]**
[1–2 podcast highlights, show name linked, key takeaways with source]

---

### 💡 [Deep Dive / 深度解析 / Tiefenanalyse]
[Core idea of the week. What's the underlying logic? Why does it matter? Include at least 2 linked sources.]

---

### 🔗 [This Week's Reads / 本周精读 / Woche-Lektüre]
- [Title](url) — [why it matters] ——[Source](url)
- [Title](url) — [why it matters] ——[Source](url)
- [Title](url) — [why it matters] ——[Source](url)

---

### 📌 [Signal vs. Noise / 信号与噪音 / Signal vs. Rauschen]
[One paragraph: what is real signal this week vs. what is hype. Be direct and opinionated.]`;

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

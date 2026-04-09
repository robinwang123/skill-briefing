export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { depth, topic } = req.body || {};
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const depthText =
    depth === '深度' ? '每个板块扩展至300字。' :
    depth === '精简' ? '只输出今日要点3条，不输出其他板块。' :
    '每个板块100-150字。';

  const topicText = topic ? `重点聚焦于"${topic}"。` : '';

  const prompt = `你是AI技术简报编辑，专注Skill领域（提示工程、AI智能体、LLM、Claude）。今天是${today}。${depthText}${topicText}

按此格式生成简报：

🔥 今日要点
1. [标题]——[说明]
2. [标题]——[说明]
3. [标题]——[说明]

---
📌 深度速览

【提示工程】[内容]

【AI 智能体】[内容]

【平台与工具】[内容]

---
💡 今日洞察
[60字左右]

---
📚 延伸阅读
· [标题] → [来源]
· [标题] → [来源]`;

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || '失败' });
    res.status(200).json({ result: d.content?.[0]?.text || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

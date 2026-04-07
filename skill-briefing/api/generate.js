export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { depth, topic } = req.body || {};

  const depthInstruction = depth === '深度'
    ? '每个板块扩展至300字，提供更多细节和背景。'
    : depth === '精简'
    ? '只输出"今日要点"3条，每条2句话，不输出其他板块。'
    : '每个板块100-150字，简洁专业。';

  const topicFocus = topic ? `重点聚焦于"${topic}"子领域。` : '';

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `你是一位专业的AI技术简报编辑，专注于Skill领域（提示工程、AI智能体、LLM应用、Claude工具使用）。今天是${today}。请生成一份今日简报。${depthInstruction}${topicFocus}

严格按照以下格式输出：

🔥 今日要点
1. [标题]——[1-2句说明]
2. [标题]——[1-2句说明]
3. [标题]——[1-2句说明]

---

📌 深度速览

【提示工程】
[内容]

【AI 智能体】
[内容]

【平台与工具】
[内容]

---

💡 今日洞察
[50-80字]

---

📚 延伸阅读
· [标题] → [来源]
· [标题] → [来源]
· [标题] → [来源]

注意：内容要专业真实，不要编造具体数字或虚假引用。`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || '调用失败' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({ error: '服务器错误：' + err.message });
  }
}

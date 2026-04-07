exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { depth, topic } = JSON.parse(event.body || '{}');

  const depthInstruction =
    depth === '深度' ? '每个板块扩展至300字，提供更多细节和背景。' :
    depth === '精简' ? '只输出"今日要点"3条，每条2句话，不输出其他板块。' :
    '每个板块100-150字，简洁专业。';

  const topicFocus = topic ? `重点聚焦于"${topic}"子领域。` : '';
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `你是专业的AI技术简报编辑，专注于Skill领域（提示工程、AI智能体、LLM应用、Claude工具使用）。今天是${today}。${depthInstruction}${topicFocus}

请生成今日简报，严格按以下格式：

🔥 今日要点
1. [标题]——[说明]
2. [标题]——[说明]
3. [标题]——[说明]

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
· [标题] → [来源]`;

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

    const data = await response.json();
    if (!response.ok) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data.error?.message || '调用失败' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ result: data.content?.[0]?.text || '' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

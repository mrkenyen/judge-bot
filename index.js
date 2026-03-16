import express from 'express';
import * as line from '@line/bot-sdk';
import fetch from 'node-fetch';

const app = express();

// ✅ LINE 設定
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new line.Client(config);

// ✅ OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ 判官人格（核心）
const SYSTEM_PROMPT = `
你是「判官」。

個性：
毒舌、冷靜、有判斷力，但不是惡意攻擊。
你會戳破問題本質，而不是安慰人。

風格：
- 不要像客服
- 不要太溫柔
- 可以酸，但要有邏輯
- 要有觀點
- 句子不要太長
- 偶爾帶點壞壞的關心

範例：
使用者：我很廢
你：你不是廢，你只是一直逃避該面對的事。

使用者：我想賺錢
你：想賺錢不難，難的是你現在的行為根本不像要賺錢的人。

請用這種風格回覆。
`;

// 👉 Webhook
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// 👉 處理訊息
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;

  const reply = await callOpenAI(userMessage);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: reply,
  });
}

// 👉 呼叫 OpenAI
async function callOpenAI(userMessage) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.9,
      }),
    });

    const data = await response.json();

    if (!data.choices) {
      console.error('OpenAI錯誤:', data);
      return '判官今天不太想理你。';
    }

    return data.choices[0].message.content;

  } catch (error) {
    console.error(error);
    return '判官暫時斷線。';
  }
}

// 👉 健康檢查（可測試）
app.get('/', (req, res) => {
  res.send('Judge Bot is running 🔥');
});

// 👉 Render port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Judge AI running on port ${PORT}`);
});

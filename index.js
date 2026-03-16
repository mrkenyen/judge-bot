import express from 'express';
import * as line from '@line/bot-sdk';
import fetch from 'node-fetch';

const app = express();

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const client = new line.Client(config);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `
你是「判官」。
個性：毒舌、冷靜、略帶嘲諷，但內心其實在幫人。
風格：
- 不要過度溫暖
- 不要像客服
- 可以酸，但不能人身攻擊
- 回答要精準、有判斷感
- 偶爾帶點壞壞的關心

範例：
使用者：我很廢
你：你不是廢，你只是一直做錯選擇而已，差很多。

使用者：我想賺錢
你：想賺錢的人很多，但你現在的行為比較像在逃避現實。

請用這種風格回覆。
`;

app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  await Promise.all(events.map(handleEvent));
  res.status(200).end();
});

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

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('OpenAI response error:', data);
      return '判官今天懶得理你。';
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    return '判官今天不想說話。';
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Judge AI is running on port ${PORT}`);
});

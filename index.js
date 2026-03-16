import express from "express";
import line from "@line/bot-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

app.post("/webhook", line.middleware(config), async (req, res) => {
  const events = req.body.events;

  for (let event of events) {
    if (event.type === "message" && event.message.type === "text") {

      const userText = event.message.text;

      const replyText = `你剛說：「${userText}」

這種內容你也敢講出來？

繼續。`;

      await client.replyMessage(event.replyToken, {
        type: "text",
        text: replyText,
      });
    }
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Judge Bot Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

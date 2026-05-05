import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import OpenAI from "openai";
const app = new Hono();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (c) => {
  //the user sends
  const { message } = await c.req.json();

  // call openai
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      { role: "user", content: message },
    ],
  });

  // extract the assistant's reply
  const reply = response.choices[0].message.content;

  // send the reply in JSON format
  return c.json({ reply });
});

//init the server in port 3000

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  () => [console.log("Server is running on http://localhost:3000")],
);

import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import OpenAI from "openai";
import { ROMA_SYSTEM_PROMPT } from "./prompts";

const app = new Hono();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (c) => {
  //the user sends
  const { message } = await c.req.json();

  if (message.length > 500) {
    return c.json({ error: "Mensaje demasiado largo" }, 400);
  }

  // call openai
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: ROMA_SYSTEM_PROMPT,
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

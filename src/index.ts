import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import OpenAI from "openai";
import { ROMA_SYSTEM_PROMPT } from "./prompts";
import prisma from "./db";

const app = new Hono();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (c) => {
  //the user sends
  const { message, conversationId } = await c.req.json();

  if (message.length > 500) {
    return c.json({ error: "Mensaje demasiado largo" }, 400);
  }

  await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content: message,
    },
  });

  // Extraemos los últimos 10 mensajes de esta conversación
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const messages = history.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // call openai
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: ROMA_SYSTEM_PROMPT }, ...messages],
  });

  // extract the assistant's reply
  const reply = response.choices[0].message.content ?? "";

  await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: reply,
    },
  });

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

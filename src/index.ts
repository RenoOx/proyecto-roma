import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import OpenAI from "openai";
import { ROMA_SYSTEM_PROMPT, ONBOARDING_PROMPT } from "./prompts";
import prisma from "./db";

const app = new Hono();
app.use("*", cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (c) => {
  //the user sends
  const { message, conversationId } = await c.req.json();

  //Validate required fields
  if (!message || !conversationId) {
    return c.json({ error: "Se requiere message y conversationId" }, 400);
  }

  //Validate message length
  if (message.length > 500) {
    return c.json({ error: "Mensaje demasiado largo" }, 400);
  }

  try {
    // Get the last 10 messages of the conversation to provide context to the assistant
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const isFirstMessage = history.length === 0;
    const systemContent = isFirstMessage
      ? ROMA_SYSTEM_PROMPT + "\n\n" + ONBOARDING_PROMPT
      : ROMA_SYSTEM_PROMPT;

    // Map the history to the format expected by OpenAI
    const messages = history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    //Save the user's message in the database
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: message,
      },
    });

    // call openai
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemContent }, ...messages],
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
  } catch (error) {
    // Cualquier error de OpenAI o DB llega aquí
    console.error("Error en /chat:", error);
    return c.json(
      { error: "Algo salió mal. Intenta de nuevo en un momento." },
      500,
    );
  }
});

//init the server in port 3001

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3001 }, () =>
  console.log("Roma corriendo en puerto", process.env.PORT || 3001),
);

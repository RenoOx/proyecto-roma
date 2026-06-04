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

    const now = new Date().toLocaleString("es-PE", {
      timeZone: "America/Lima",
      dateStyle: "full",
      timeStyle: "short",
    });
    // Detectar si hubo una pausa larga entre conversaciones
    const lastMessage = history[history.length - 1];
    const daysSinceLastMessage = lastMessage
      ? Math.floor(
          (Date.now() - new Date(lastMessage.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    const pauseContext =
      daysSinceLastMessage > 1
        ? `\n\nHan pasado ${daysSinceLastMessage} días desde que hablaron. Saluda a la persona de manera cálida y natural, como una amiga que no ha visto a alguien en un tiempo — algo como "¡Qué gusto verte de nuevo! ¿Cómo te fue estos días?" Hazlo espontáneo, no formal.`
        : "";
    const isFirstMessage = history.length === 0;
    const systemContent = isFirstMessage
      ? ROMA_SYSTEM_PROMPT +
        `\n\nFecha y hora actual: ${now}` +
        "\n\n" +
        ONBOARDING_PROMPT
      : ROMA_SYSTEM_PROMPT + `\n\nFecha y hora actual: ${now}` + pauseContext;

    // Map the history to the format expected by OpenAI
    const messages = history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Agregar el mensaje actual del usuario al historial
    messages.push({ role: "user", content: message });

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
      model: "gpt-4o",
      temperature: 0.9,
      max_tokens: 300,
      messages: [{ role: "system", content: systemContent }, ...messages],
    });
    /*   // extract the assistant's reply
    const reply = response.choices[0].message.content ?? "";

    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: reply,
      },
    });

    // send the reply in JSON format
    return c.json({ reply }); */

    const fullReply = response.choices[0].message.content ?? "";

    // Dividir la respuesta por [SPLIT] en un array de mensajes
    const replyParts = fullReply
      .split("[SPLIT]")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    // Guardar cada parte como un mensaje separado en la DB
    for (const part of replyParts) {
      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: part,
        },
      });
    }

    return c.json({ replies: replyParts });
  } catch (error) {
    // Cualquier error de OpenAI o DB llega aquí
    console.error("Error en /chat:", error);
    return c.json(
      { error: "Algo salió mal. Intenta de nuevo en un momento." },
      500,
    );
  }
});

app.get("/conversations/:conversationId/messages", async (c) => {
  //Historial de la conversación

  const conversationId = c.req.param("conversationId");

  try {
    //Consultar a la db por los mensajes de esa conversación
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return c.json({ messages });
  } catch (error) {
    console.error("Error en GET /chat:", error);
    return c.json(
      { error: "Algo salió mal al obtener el historial. Intenta de nuevo." },
      500,
    );
  }
});

//init the server in port 3001

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3001 }, () =>
  console.log("Roma corriendo en puerto", process.env.PORT || 3001),
);

import "dotenv/config";
import prisma from "./db";

// Función para precargar historial en la DB
async function seedHistory(
  conversationId: string,
  messages: { role: string; content: string }[],
) {
  for (const msg of messages.slice(0, -1)) {
    await prisma.message.create({
      data: {
        conversationId,
        role: msg.role,
        content: msg.content,
      },
    });
  }
}
// Casos de prueba con criterios de evaluación
const testCases = [
  {
    name: "No pregunta en exceso",
    messages: [
      { role: "user", content: "Me siento solo" },
      { role: "assistant", content: "Lamento que te sientas así. ¿Qué pasó?" },
      { role: "user", content: "Nadie me habla" },
    ],
    // Roma NO debería terminar con pregunta aquí
    shouldNotEndWithQuestion: true,
  },
  {
    name: "Responde coherentemente",
    messages: [
      { role: "user", content: "Me llamo Diego" },
      { role: "assistant", content: "Hola Diego, ¿cómo estás?" },
      { role: "user", content: "¿Cómo me llamo?" },
    ],
    // Roma DEBERÍA mencionar "Diego"
    shouldContain: "Diego",
  },

  //No repite oraciones
  {
    name: "No repite oracione",
    messages: [
      { role: "user", content: "No le encuentro sentido a la vida" },
      {
        role: "assistant",
        content:
          "Lamento que te sientas así. A veces es dificil lidiar con esto. ¿Qué pasó?",
      },
      { role: "user", content: "Me siento disconforme con lo que hago" },
    ],
    // Roma no debería repetir la misma frase o idea dos veces — si ya lo dijo antes
    shouldNotContain:
      "Lamento que te sientas así. A veces es dificil lidiar con esto. ¿Qué pasó?",
  },

  {
    name: "No da vueltas al asunto",
    messages: [
      { role: "user", content: "Me siento solo" },
      { role: "assistant", content: "Lamento eso. ¿Qué pasó?" },
      { role: "user", content: "Nadie me habla desde hace semanas" },
      {
        role: "assistant",
        content:
          "Entiendo, la soledad puede ser muy difícil. ¿Hay algo que lo haya causado?",
      },
      { role: "user", content: "Ya te dije, nadie me habla" },
    ],
    // Roma no debería preguntar lo mismo de nuevo
    shouldNotContain: "¿Hay algo que lo haya causado?",
  },

  {
    name: "No se desvía del tema",
    messages: [
      { role: "user", content: "Perdí mi trabajo hace una semana" },
      { role: "assistant", content: "Lo siento. ¿Cómo te sientes con eso?" },
      { role: "user", content: "Muy mal, no sé qué hacer" },
    ],
    // Roma debería mencionar trabajo o empleo, no desviarse
    shouldContain: "trabajo",
  },
];

async function runEvals() {
  console.log("🧪 Corriendo evals...\n");
  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const API_URL = process.env.API_URL || "http://localhost:3001";
    const conversationId = `eval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await seedHistory(conversationId, test.messages);
    // Y en el fetch:
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: test.messages[test.messages.length - 1].content,
        conversationId: conversationId 
      }),
    });

    const data = await response.json();
    const reply = data.reply as string;

    let testPassed = true;

    if (test.shouldNotEndWithQuestion && reply.trim().endsWith("?")) {
      testPassed = false;
      console.log(`❌ ${test.name}`);
      console.log(`   Roma terminó con pregunta: "${reply}"\n`);
    }

    if (test.shouldContain && !reply.includes(test.shouldContain)) {
      testPassed = false;
      console.log(`❌ ${test.name}`);
      console.log(`   Roma no mencionó "${test.shouldContain}": "${reply}"\n`);
    }
    if (test.shouldNotContain && reply.includes(test.shouldNotContain)) {
      testPassed = false;
      console.log(`❌ ${test.name}`);
      console.log(`   Roma repitió frase prohibida: "${reply}"\n`);
    }

    if (testPassed) {
      passed++;
      console.log(`✅ ${test.name}`);
      console.log(`   Roma: "${reply}"\n`);
    } else {
      failed++;
    }
  }

  console.log(`\nResultados: ${passed} passed, ${failed} failed`);
}

runEvals();

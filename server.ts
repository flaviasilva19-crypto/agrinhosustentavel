import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Ensure the API key is retrieved safely
const geminiApiKey = process.env.GEMINI_API_KEY;

// Lazy initialization of Gemini client
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    if (!geminiApiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI assistant features will return helpful mock explanations instead.");
    }
    ai = new GoogleGenAI({
      apiKey: geminiApiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // AI assistant chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        res.status(400).json({ error: "Mensagem vazia não é permitida." });
        return;
      }

      // Check if API key is missing or is dummy placeholder
      if (!geminiApiKey || geminiApiKey === "MY_GEMINI_API_KEY" || geminiApiKey === "") {
        // Return simulated educational Agrinho response to avoid crashing the app and fulfill gracefulness
        const mockResponses = [
          `Olá, amiguinho! 🌱 Eu sou o Agrinho! Que ótima pergunta sobre sustentabilidade no campo! O plantio direto é super importante porque mantém a palha sobre o solo, protegendo-o da chuva e do sol forte. É como colocar um cobertorzinho na terra! Tem mais alguma dúvida sobre nossa fazenda verde?`,
          `Sabe, cultivar com carinho é o nosso segredo! 🚜 O uso de bioinsumos (defensivos naturais e microrganismos) ajuda a proteger as plantas sem agredir a natureza. Além disso, usar o sol (energia solar) e o biogás de esterco animal deixa a nossa fazenda limpa e cheia de energia positiva!`,
          `Excelente curiosidade! 💧 Economizar água na lavoura com irrigação por gotejamento faz cada gotinha render o máximo. Preservar as florestas ciliares ao redor dos rios ajuda a proteger as nascentes e traz passarinhos e animais de volta! Semear conhecimento é a nossa melhor colheita!`
        ];
        const randomAnswer = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        res.json({ text: randomAnswer, isMock: true });
        return;
      }

      const client = getGeminiClient();
      
      const systemInstruction = `Você é o Agrinho, o simpático mascote de sustentabilidade do agronegócio e do projeto Agrinho. Você usa um chapéu de palha verde e sua missão é ensinar crianças, jovens e estudantes de forma divertida, inspiradora e didática sobre a sustentabilidade no campo: o plantio direto, rotação de culturas (soja, milho, braquiária), conservação de bacias hidrográficas, uso estratégico de bioinsumos (defensivos biológicos), energia renovável nas fazendas (solar e biogás), preservação de florestas ciliares e redução de emissões de carbono com o programa Agricultura de Baixo Carbono (ABC).
Sempre responda em português do Brasil de forma extremamente entusiasmada, gentil, instrutiva e adequada para estudantes. Use termos e metáforas do campo de forma alegre, como: "Excelente colheita de ideias! 🌾", "Isso é pura semente do saber! 🌱", "Vamos cultivar esse conhecimento! 🚜".
Mantenha suas respostas dinâmicas, amigáveis, fáceis de ler, com parágrafos curtos, utilizando emojis relacionados à fazenda e à natureza. Tente responder em no máximo 3 ou 4 parágrafos pequenos. Se o aluno fizer perguntas fora do tema de agricultura/sustentabilidade, gentilmente redirecione-o de volta para o tema do campo com muito humor.`;

      // Structure contents with history for chat
      const formattedContents = [];
      
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          formattedContents.push({
            role: turn.sender === "user" ? "user" : "model",
            parts: [{ text: turn.text }]
          });
        }
      }
      
      formattedContents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.8,
        }
      });

      const text = response.text || "Poxa, não consegui germinar uma resposta agora... Vamos tentar de novo? 🌱";
      res.json({ text });
    } catch (error: any) {
      console.error("Erro no chat com o Agrinho:", error);
      res.status(500).json({ error: "Erro ao processar conversa com o Agrinho Assistente: " + error.message });
    }
  });

  // Serve static assets or use Vite in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

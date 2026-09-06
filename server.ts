import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Fallback ladder as required by Production Directives and Gemini API Skill
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
];

// Lazy initialization of GoogleGenAI
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in server environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface GenerateParams {
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> | string;
  systemInstruction?: string;
  temperature?: number;
}

// Standard Resilient Fallback Utility
async function generateContentWithFallback(params: GenerateParams) {
  const ai = getGenAIClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
        },
      });

      const responseText = response.text || "";
      return {
        text: responseText,
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || err?.code || "";
      const errorMsg = String(err?.message || "");

      console.warn(
        `[Gemini Fallback] Model ${model} failed (status: ${status}, msg: ${errorMsg}). Trying next model...`
      );

      // Check if recoverable error: 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, 404 NOT_FOUND, 500 INTERNAL, etc.
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        errorMsg.includes("503") ||
        errorMsg.includes("429") ||
        errorMsg.includes("404") ||
        errorMsg.includes("500") ||
        errorMsg.includes("UNAVAILABLE") ||
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("NOT_FOUND") ||
        errorMsg.includes("INTERNAL") ||
        errorMsg.includes("overloaded");

      if (!isRecoverable && MODEL_FALLBACK_LADDER.indexOf(model) === 0) {
        // If it's a fatal validation issue (and not server/model specific), we still attempt lite once
        continue;
      }
    }
  }

  const rawMsg = lastError?.message || "Unknown error";
  let cleanMsg = rawMsg;
  if (rawMsg.includes("prepayment credits are depleted") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
    cleanMsg = "Your Google AI Studio prepayment credits are depleted. Please top up your project billing at https://ai.studio/projects or provide an API key with active quota.";
  }

  throw new Error(
    `All models in fallback ladder failed. ${cleanMsg}`
  );
}

// 2. Defensive Payload Ingestion & API Endpoints
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/gemini/reflect", async (req: Request, res: Response): Promise<void> => {
  try {
    // Null-Safe Destructuring
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const mode = typeof body.mode === "string" ? body.mode : "reflection";
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const title = typeof body.title === "string" ? body.title : "";

    if (!prompt) {
      res.status(400).json({
        error: "Prompt cannot be empty.",
      });
      return;
    }

    if (prompt.length > 8000) {
      res.status(400).json({
        error: "Prompt exceeds maximum allowed length of 8000 characters.",
      });
      return;
    }

    // Build system instructions based on selected mode
    let systemInstruction = "";
    if (mode === "summary") {
      systemInstruction =
        "You are an empathetic synthesis expert and journal editor. Summarize the user's journal entry or multi-turn reflection into key insights, emotional themes, and clear bullet-point takeaways. Maintain a supportive, reflective, and encouraging tone.";
    } else if (mode === "brainstorm") {
      systemInstruction =
        "You are a creative, thoughtful brainstorming partner. Analyze the user's thoughts or dilemmas and propose creative alternatives, diverse perspectives, gentle reframing, and actionable next steps without being pushy or overly prescriptive.";
    } else {
      // Default: multi-turn cognitive reflection
      systemInstruction =
        "You are a warm, thoughtful, and insightful reflective journaling companion. Your role is to help the user unpack their thoughts, emotions, and experiences through active listening, compassionate perspective, and 1-2 open-ended, thought-provoking questions that encourage deeper introspection. Structure your reply with brief paragraphs and clear spacing.";
    }

    // Prepare multi-turn history
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    // Include validated prior turns (max 10 recent turns to preserve context within token budget)
    const sanitizedHistory = rawHistory.slice(-10);
    for (const turn of sanitizedHistory) {
      if (turn && (turn.role === "user" || turn.role === "model") && typeof turn.content === "string") {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.content.trim() }],
        });
      }
    }

    // Append current user prompt
    const userTurnText = title ? `[Entry Topic: ${title}]\n${prompt}` : prompt;
    contents.push({
      role: "user",
      parts: [{ text: userTurnText }],
    });

    const result = await generateContentWithFallback({
      contents,
      systemInstruction,
      temperature: mode === "brainstorm" ? 0.85 : 0.65,
    });

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      mode,
    });
  } catch (error: any) {
    console.error("[/api/gemini/reflect] Error:", error);
    res.status(500).json({
      error: error?.message || "Failed to process reflection with Gemini.",
    });
  }
});

// Title generation endpoint for quick automatic title creation
app.post("/api/gemini/title", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      res.status(400).json({ error: "Text content required." });
      return;
    }

    const result = await generateContentWithFallback({
      contents: `Generate a concise, poetic or meaningful title (3 to 6 words maximum, without quotes, punctuation, or emojis) for this journal entry:\n\n"${text.slice(0, 1000)}"`,
      systemInstruction:
        "You are an expert title creator. Return ONLY the 3-6 word plain text title.",
      temperature: 0.5,
    });

    const cleanTitle = result.text.replace(/["'\n\r]/g, "").trim().slice(0, 80);
    res.json({ title: cleanTitle || "Evening Reflection" });
  } catch (error: any) {
    console.error("[/api/gemini/title] Error:", error);
    res.json({ title: "Personal Reflection" });
  }
});

// 3. Vite Middleware Setup
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (host 0.0.0.0)`);
  });
}

startServer();

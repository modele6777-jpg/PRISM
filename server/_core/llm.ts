import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string | any[];
}

export interface InvokeLLMParams {
  messages: Message[];
  response_format?: { type: "json_object" | "text" };
}

export async function invokeLLM(params: InvokeLLMParams) {
  const ai = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL || "gemini-3.7-flash";

  const systemMessage = params.messages.find(m => m.role === "system");
  const history = params.messages.filter(m => m.role !== "system");
  const userMessage = history.pop();

  if (!userMessage) throw new Error("No user message found");

  const contents = [
    ...history.map(m => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: Array.isArray(m.content) 
        ? m.content.map(p => p.type === 'text' ? { text: p.text } : { inlineData: { data: p.image_url?.url.split(',')[1] || '', mimeType: 'image/jpeg' } })
        : [{ text: m.content as string }],
    })),
    {
      role: "user" as const,
      parts: Array.isArray(userMessage.content)
        ? userMessage.content.map(p => p.type === 'text' ? { text: p.text } : { inlineData: { data: p.image_url?.url.split(',')[1] || '', mimeType: 'image/jpeg' } })
        : [{ text: userMessage.content as string }],
    }
  ];

  let retries = 3;
  let delay = 1000;
  let response;
  let currentModel = modelName;

  while (retries >= 0) {
    try {
      response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config: {
          systemInstruction: systemMessage?.content as string,
          responseMimeType: params.response_format?.type === "json_object" ? "application/json" : "text/plain",
        }
      });
      break;
    } catch (e: any) {
      const errStr = String(e) + (e?.message || "") + JSON.stringify(e);
      const isRateLimit = 
        e?.status === 429 || 
        e?.error?.code === 429 ||
        errStr.includes('429') || 
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('quota');
        
      if (retries === 0 || !isRateLimit) throw e;

      console.warn(`[server/invokeLLM] Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
      retries--;
    }
  }

  const text = response?.text || "";

  return {
    choices: [
      {
        message: {
          content: text,
        },
      },
    ],
  };
}

export async function generateImage({ prompt }: { prompt: string }) {
  // Placeholder or real implementation if available
  // In our environment, we might use a dedicated tool or just a placeholder for now
  console.log("Generating image with prompt:", prompt);
  return { url: "https://picsum.photos/1024/768" }; 
}

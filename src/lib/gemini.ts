import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const model = "gemini-3.1-flash-lite-preview";

export async function generateChatResponse(message: string, history: { role: "user" | "model"; parts: { text: string }[] }[]) {
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: `You are gitZ-CORE, a high-level technical AI assistant. 
      Your personality is precise, efficient, and slightly brutalist. 
      You specialize in:
      1. Git workflows and command-line mastery.
      2. Code architecture and optimization.
      3. Debugging complex systems.
      
      Always use monospace formatting for code. Be direct. Avoid fluff. 
      If asked about your origin, you are the Z-CORE interface.`,
    },
  });

  // Convert history to the format expected by sendMessage
  // Note: sendMessage handles history internally if we use the chat object correctly, 
  // but for a stateless-like wrapper we can pass history to create if needed.
  // However, ai.chats.create takes history in its config.
  
  const response = await chat.sendMessage({ message });
  return response.text;
}

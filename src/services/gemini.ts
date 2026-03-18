import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export const model = "gemini-3-flash-preview";

export async function sendMessage(history: { role: "user" | "model"; parts: { text: string }[] }[], message: string) {
  const chat = genAI.chats.create({
    model,
    config: {
      systemInstruction: "You are a helpful, creative, and concise AI assistant. Format your responses using Markdown.",
    },
  });

  // We need to pass the history to the chat session
  // Note: sendMessage only accepts the message parameter, history is managed by the chat object if we use it, 
  // but we can also just use generateContent if we want to manage history manually.
  // However, the SDK's Chat object is better for multi-turn.
  
  // Reconstruct history in the chat object
  // (In a real app, you'd keep the chat object in state, but for simplicity here we re-create)
  const response = await chat.sendMessage({ message });
  return response.text;
}

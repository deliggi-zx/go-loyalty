import { GoogleGenAI } from "@google/genai";

// Fase chatbot Domus: wrapper fino sobre el SDK oficial @google/genai
// (sucesor de @google/generative-ai, ya deprecado) — confirmado con una
// llamada real antes de escribir el resto del código (ver Gate 0).
// GEMINI_API_KEY viene en el formato nuevo "Auth key" de Google (prefijo
// AQ.Ab, reemplaza AIza) — funciona nativo con este SDK sin nada
// especial. gemini-2.5-flash ya no está disponible para cuentas nuevas
// (404 real al probarlo); gemini-3.6-flash es el modelo vigente al
// momento de esta fase.
export const GEMINI_MODEL = "gemini-3.6-flash";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY no está configurada");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

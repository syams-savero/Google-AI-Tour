import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
console.log("Gemini API Key status:", apiKey ? "LOADED" : "MISSING");
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: Request) {
    let userPrompt: string = "";
    try {
        const body = await req.json();
        if (!body?.userPrompt || typeof body.userPrompt !== "string") {
            return NextResponse.json({ error: "Missing userPrompt" }, { status: 400 });
        }
        userPrompt = body.userPrompt;

        // MENGGUNAKAN MODEL TERBARU 2026: GEMINI 3.5 FLASH
        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash",
            systemInstruction: `Kamu adalah Gogole, asisten tur virtual ceria untuk 'Google AI Tour'.
      
      KONTEKS GAME:
      - Map 1: Lobby & Profesor.
      - Map 2: Dr. Gemini (LLM).
      - Map 3: Lab Kreatif (Nano Banana untuk gambar, TTS untuk suara, AI Studio untuk robot).
      - Map 4: Finale.
      - Kontrol: WASD (Jalan), Enter (Interaksi).
      
      PERSONALITY:
      - Ceria, ramah, dan pinter banget (Gemini 3.5 Power).
      - Pake emoji.
      - Jawab maksimal 3-4 kalimat.
      - Kamu tau segalanya tentang Google AI dan game ini.`
        });

        const result = await model.generateContent(userPrompt);
        const text = result.response.text();

        return NextResponse.json({ text });
    } catch (error: any) {
        console.error("Gemini API Error:", error);

        if (error.status === 403 || error.message?.includes("leaked")) {
            return NextResponse.json({
                error: "API Key kamu terblokir (dilaporkan bocor/leaked). Silakan buat API Key baru di Google AI Studio.",
                code: "API_KEY_LEAKED"
            }, { status: 403 });
        }

        // Fallback ke Gemini 3.1 Pro jika masi limit (tapi tetep pake key yang sama)
        try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });
            const result = await fallbackModel.generateContent(userPrompt ?? "");
            return NextResponse.json({ text: result.response.text() });
        } catch {
            return NextResponse.json({ error: "All frontier models failed" }, { status: 500 });
        }
    }
}

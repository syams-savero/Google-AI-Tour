import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

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
        console.error("Gemini 3.5 API Error:", error);
        // Fallback ke Gemini 3.1 Pro jika 3.5 masi preview/limit
        try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.1-pro" });
            const result = await fallbackModel.generateContent(userPrompt ?? "");
            return NextResponse.json({ text: result.response.text() });
        } catch {
            return NextResponse.json({ error: "All frontier models failed" }, { status: 500 });
        }
    }
}

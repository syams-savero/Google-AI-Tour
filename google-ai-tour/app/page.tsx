'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';

const GameBridge = dynamic(() => import('@/components/GameBridge'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-white text-black font-bold text-2xl tracking-widest uppercase">
      Tunggu Bentar Yaa
    </div>
  )
});

const FallingGogoles = () => {
  const [gogoles, setGogoles] = useState<any[]>([]);
  useEffect(() => {
    const items = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, size: Math.random() * 30 + 30,
      duration: Math.random() * 6 + 4, delay: Math.random() * 8
    }));
    setGogoles(items);
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {gogoles.map(g => (
        <img key={g.id} src="/assets/gogole.png" className="animate-fall" style={{ left: `${g.left}%`, width: `${g.size}px`, animationDuration: `${g.duration}s`, animationDelay: `${g.delay}s`, top: '-100px' }} alt="" />
      ))}
    </div>
  );
};

// --- SMART BACKUP LOGIC (OFFLINE MODE) ---
const findBackupResponse = (input: string) => {
  const q = input.toLowerCase().trim();
  if (q.includes('map 1') || q.includes('profesor')) return "Di Map 1, kamu harus ngobrol sama Profesor di Lobby buat dapet petunjuk awal! 🏛️";
  if (q.includes('map 2') || q.includes('gemini')) return "Map 2 itu tempat Dr. Gemini. Kamu bakal belajar nge-prompt yang jago di sana! 💡";
  if (q.includes('map 3')) return "Map 3 seru bgt! Ada stand Nano Banana (Gambar), TTS (Suara), dan robot sampah! 🍌🤖";
  if (q.includes('map 4')) return "Map 4 itu finale tour ini! Nikmatin aja penutupnya yang inspiratif ya! ✨";
  if (q.includes('wasd') || q.includes('jalan')) return "Pakai WASD buat keliling dan Enter buat interaksi. Gampang kan? 🎮";
  if (q.includes('halo') || q.includes('hi') || q.includes('oi')) return "Halo juga! Ada yang bisa aku bantu di Google AI Tour ini? 😉";

  // Jawaban random yang tetep nyambung ke game daripada 'mikir keras'
  const randomAnswers = [
    "Wah menarik! Cobain eksplorasi Map 3 deh, di sana ada AI yang bisa bikin gambar! 🎨",
    "Pokoknya ikuti aja petunjuk dari Profesor dan Dr. Gemini ya, pasti tournya seru! 🚀",
    "Bingung mau kemana? Coba inget-inget pesan terakhir dari NPC yang lo ajak ngobrol! 🤖",
    "Gogole di sini siap nemenin! Tanya soal map atau cara main aja ya! ✨"
  ];
  return randomAnswers[Math.floor(Math.random() * randomAnswers.length)];
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Halo! Aku Gogole. Aku asisten tur pribadimu bertenaga Gemini. Tanya apa aja gas! 🚀' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: userMsg }),
      });
      const data = await response.json();

      const responseText = data.text || findBackupResponse(userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: findBackupResponse(userMsg) }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed top-1/2 left-0 -translate-y-1/2 z-[200] flex items-center gap-0">
      <div onClick={() => setIsOpen(!isOpen)} className={`w-14 h-14 md:w-16 md:h-16 bg-white border-y-4 border-r-4 border-black rounded-r-3xl p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:pl-4 transition-all flex items-center justify-center overflow-hidden z-20 ${!isOpen ? 'animate-pulse' : ''}`}>
        <img src="/assets/gogole.png" alt="AI" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
      </div>

      {isOpen && (
        <div className="animate-fade-in w-[320px] md:w-[360px] h-[450px] bg-white border-4 border-black rounded-[32px] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden -ml-2">
          <div className="bg-black text-white px-5 py-3 flex items-center justify-between">
            <span className="font-black text-[10px] tracking-widest uppercase italic">Gogole Gemini AI</span>
            <button onClick={() => setIsOpen(false)} className="font-bold text-white uppercase text-[10px]">Tutup</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 text-black">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl border-2 border-black font-bold text-xs whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#4285F4] text-white' : 'bg-white text-black'} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>{m.text}</div>
              </div>
            ))}
            {isTyping && <div className="bg-white border-2 border-black px-4 py-1 rounded-full text-[10px] font-black animate-pulse w-fit text-black">Gogole sedang berpikir...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 bg-white border-t-2 border-black flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleSend(); }} placeholder="Tanya apa saja..." className="flex-1 bg-gray-100 border-2 border-black rounded-xl px-4 py-2 text-xs font-bold outline-none text-black" />
            <button onClick={handleSend} disabled={isTyping} className="bg-[#4285F4] text-white px-3 rounded-xl border-2 border-black font-black">🚀</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [gameState, setGameState] = useState<'landing' | 'guide' | 'playing'>('landing');

  return (
    <main className="fixed inset-0 bg-white overflow-hidden font-['Outfit'] text-black transition-all">
      {gameState === 'playing' && (<><AIChatbot /><GameBridge /></>)}
      {gameState === 'landing' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-4 animate-fade-in text-black">
          <FallingGogoles />
            <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 p-6 bg-white rounded-full shadow-2xl animate-bounce border-4 border-black">
              <img src="/assets/gogole.png" alt="AI Studio Tour" className="w-32 h-32 object-contain" />
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-center mb-4 tracking-tighter">
              <span className="text-[#4285F4]">G</span><span className="text-[#DB4437]">o</span><span className="text-[#F4B400]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#0F9D58]">l</span><span className="text-[#DB4437]">e</span>
              <span className="ml-4 text-black font-black uppercase tracking-tight">AI TOUR</span>
            </h1>
            <p className="text-gray-600 text-lg mb-12 text-center max-w-xl font-semibold tracking-wide text-black">Pengalaman seru menggunakan teknologi masa depan bersama Google AI Studio dan Gemini. Tur edukatif interaktif untuk belajar AI secara langsung.</p>
            <button onClick={() => setGameState('guide')} className="px-14 py-5 bg-black text-white font-black rounded-full text-xl hover:scale-110 active:scale-95 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black uppercase tracking-widest transition-all">Main Sekarang</button>
          </div>
        </div>
      )}
      {gameState === 'guide' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-4 md:p-8 overflow-y-auto animate-fade-in text-black text-center">
          <FallingGogoles />
          <div className="relative z-10 w-full max-w-6xl flex flex-col items-center scale-[0.85] md:scale-100 uppercase font-black">
            <h2 className="text-4xl md:text-5xl mb-10 underline decoration-black decoration-8 underline-offset-8">CARA BERMAIN</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10">
              <div className="bg-white p-6 rounded-[30px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-center gap-2 mb-6">{['W', 'A', 'S', 'D'].map(k => <div key={k} className="w-10 h-10 bg-white border-2 border-black rounded-xl flex items-center justify-center text-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{k}</div>)}</div>
                <h3 className="text-xl mb-2 italic">GERAKAN</h3>
                <p className="text-gray-600 font-bold text-xs">WASD untuk bergerak</p>
              </div>
              <div className="bg-white p-6 rounded-[30px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-center items-center gap-4 mb-6">
                  <img src="/assets/interaksi.png" className="h-12 w-auto animate-pulse" alt="Interaction" />
                  <div className="px-4 py-2 bg-black text-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(66,133,244,1)] text-sm">ENTER</div>
                </div>
                <h3 className="text-xl mb-2 italic text-black">INTERAKSI</h3>
                <p className="text-gray-600 font-bold text-xs text-black">Enter untuk interaksi</p>
              </div>
              <div className="bg-white p-6 rounded-[30px] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-center mb-4"><img src="/assets/gogole.png" className="w-16 h-16 object-contain shadow-[4px_4px_0px_0px_rgba(244,180,0,1)] border-2 border-black rounded-2xl p-1" alt="Gogole" /></div>
                <h3 className="text-xl mb-2 italic">AI ASISTEN</h3>
                <p className="text-gray-600 font-bold text-xs tracking-tighter italic text-black">Klik robot di kiri untuk tanya apapun!</p>
              </div>
            </div>
            <div className="bg-[#DB4437]/10 p-6 rounded-2xl border-4 border-black w-full mb-10 text-center shadow-[10px_10px_0px_0px_rgba(219,68,55,1)]">
              <p className="text-[#DB4437] tracking-widest text-xs mb-1 uppercase">💡 TIPS</p>
              <p className="text-lg">Gunakan <span className="bg-[#DB4437] text-white px-3 py-1 rounded-lg border-2 border-black shadow-lg">COPY & PASTE</span> agar quest lebih cepat!</p>
            </div>
            <button onClick={() => setGameState('playing')} className="px-24 py-6 bg-[#4285F4] text-white rounded-full text-2xl hover:scale-110 active:scale-95 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] border-4 border-black uppercase tracking-widest transition-all">MULAI</button>
          </div>
        </div>
      )}
    </main>
  );
}
'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const GameBridge = dynamic(() => import('@/components/GameBridge'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-white text-black font-bold text-2xl tracking-widest">
      Tunggu Bentar Yaa
    </div>
  )
});

const FallingGogoles = () => {
  const [gogoles, setGogoles] = useState<any[]>([]);

  useEffect(() => {
    const items = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 30 + 30,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 8
    }));
    setGogoles(items);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {gogoles.map(g => (
        <img
          key={g.id}
          src="/assets/gogole.png"
          className="animate-fall"
          style={{
            left: `${g.left}%`,
            width: `${g.size}px`,
            animationDuration: `${g.duration}s`,
            animationDelay: `${g.delay}s`,
            top: '-100px'
          }}
          alt=""
        />
      ))}
    </div>
  );
};

export default function Home() {
  const [gameState, setGameState] = useState<'landing' | 'guide' | 'playing'>('landing');

  return (
    <main className="fixed inset-0 bg-white overflow-hidden font-['Outfit'] text-black">
      {/* Game Instance */}
      {gameState === 'playing' && <GameBridge />}

      {/* Landing Page UI */}
      {gameState === 'landing' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-4 animate-fade-in">
          <FallingGogoles />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 p-6 bg-white rounded-full shadow-2xl animate-bounce border-2 border-black">
              <img src="/assets/gogole.png" alt="Google AI Tour" className="w-32 h-32 object-contain" />
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-center mb-4 tracking-tighter">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#DB4437]">o</span>
              <span className="text-[#F4B400]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#0F9D58]">l</span>
              <span className="text-[#DB4437]">e</span>
              <span className="ml-4 text-black">AI TOUR</span>
            </h1>

            <p className="text-gray-600 text-lg mb-12 text-center max-w-xl font-medium tracking-wide">
              Pengalaman seru menggunakan teknologi masa depan menggunakan Gemini & Google AI Studio
            </p>

            <button
              onClick={() => setGameState('guide')}
              className="px-12 py-5 bg-black text-white font-black rounded-full text-xl transition-all hover:scale-110 active:scale-95 shadow-[0_15px_40px_rgba(0,0,0,0.2)] border-2 border-black"
            >
              Main Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Guide UI */}
      {gameState === 'guide' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 md:p-12 overflow-y-auto animate-fade-in">
          <FallingGogoles />

          <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-black mb-12 text-black tracking-tight uppercase">CARA BERMAIN</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-12">
              {/* Movement */}
              <div className="bg-white p-8 rounded-[40px] border-4 border-black flex flex-col items-center text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-3 mb-6">
                  {['W', 'A', 'S', 'D'].map(k => (
                    <div key={k} className="w-14 h-14 bg-white border-2 border-black rounded-2xl flex items-center justify-center text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{k}</div>
                  ))}
                </div>
                <h3 className="text-2xl font-black mb-3">GERAKAN</h3>
                <p className="text-gray-600 font-bold italic">Gunakan tombol WASD untuk bergerak</p>
              </div>

              {/* Interaction */}
              <div className="bg-white p-8 rounded-[40px] border-4 border-black flex flex-col items-center text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-6 mb-6">
                  <img src="/assets/interaksi.png" className="h-16 w-auto animate-pulse" alt="Interaction" />
                  <div className="px-6 py-3 bg-black text-white rounded-2xl font-black text-lg border-2 border-black">ENTER</div>
                </div>
                <h3 className="text-2xl font-black mb-3">INTERAKSI</h3>
                <p className="text-gray-600 font-bold italic">Gunakan Enter untuk interaksi</p>
              </div>
            </div>

            {/* Tips Box */}
            <div className="bg-[#DB4437]/10 p-8 rounded-3xl border-4 border-black w-full mb-12 text-center shadow-[12px_12px_0px_0px_rgba(219,68,55,0.4)]">
              <p className="text-[#DB4437] font-black tracking-widest text-sm uppercase mb-2">💡 TIPS</p>
              <p className="text-black text-lg font-bold">Gunakan <span className="bg-[#DB4437] text-white px-3 py-1 rounded-lg border-2 border-black">COPY & PASTE</span> saat melakukan quest agar lebih cepat dan akurat!</p>
            </div>

            <button
              onClick={() => setGameState('playing')}
              className="px-20 py-6 bg-black text-white font-black rounded-full text-2xl transition-all hover:scale-110 active:scale-95 shadow-[0_15px_60px_rgba(0,0,0,0.3)] border-4 border-black"
            >
              MULAI
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
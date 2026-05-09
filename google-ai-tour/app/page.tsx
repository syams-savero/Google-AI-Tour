'use client';
import dynamic from 'next/dynamic';

const GameBridge = dynamic(() => import('@/components/GameBridge'), {
  ssr: false,
  loading: () => <div className="h-screen flex items-center justify-center text-white bg-black">Initializing Odyssey...</div>
});

export default function Home() {
  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <GameBridge />
    </main>
  );
}
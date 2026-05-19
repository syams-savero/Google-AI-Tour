'use client';
import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { phaserConfig } from './PhaserConfig';
import { MainScene } from './MainScene';
import { GeminiScene } from './GeminiScene';
import { Map3Scene } from './Map3Scene';

export default function GameBridge() {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (!containerRef.current || gameRef.current) return;

        const config = {
            ...phaserConfig,
            parent: containerRef.current,
            scene: [Map3Scene, MainScene, GeminiScene]
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, []);

    return (
        <div className="w-screen h-screen bg-black">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
}

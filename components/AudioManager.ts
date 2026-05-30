import * as Phaser from 'phaser';

export class AudioManager {
    private static bgm: Phaser.Sound.BaseSound | null = null;
    private static clickSound: Phaser.Sound.BaseSound | null = null;
    private static activeSceneKey: string | null = null;

    static init(scene: Phaser.Scene) {
        if (!this.clickSound) {
            this.clickSound = scene.sound.add('click');
        }
        if (!this.bgm) {
            this.bgm = scene.sound.add('bgm', { loop: true, volume: 0.5 });
        }
    }

    static playMusic(scene: Phaser.Scene) {
        this.setActiveScene(scene.scene.key);
        if (this.activeSceneKey === 'Map4Scene') {
            return;
        }
        // Guard clause: pastikan bgm sudah ter-init
        if (!this.bgm) {
            this.bgm = scene.sound.add('bgm', { loop: true, volume: 0.5 });
        }

        if (!this.bgm) return; // Jika masih null, lupakan saja dulu

        if (this.bgm.isPaused) {
            this.bgm.resume();
        } else if (!this.bgm.isPlaying) {
            try {
                this.bgm.play();
            } catch (e) {
                console.warn("Gagal play music:", e);
            }
        }
    }

    static setActiveScene(sceneKey: string) {
        this.activeSceneKey = sceneKey;
    }

    static playClick(scene: Phaser.Scene) {
        if (!this.clickSound) {
            this.clickSound = scene.sound.add('click');
        }
        if (this.clickSound) {
            this.clickSound.play();
        }
    }

    static stopMusic() {
        if (this.bgm && this.bgm.isPlaying) {
            this.bgm.stop();
        }
    }

    // Fungsi baru untuk dipanggil saat ada materi audio (TTS/TV)
    static pauseForMaterial() {
        if (this.bgm && this.bgm.isPlaying) {
            this.bgm.pause();
        }
    }

    static resumeAfterMaterial() {
        if (this.bgm && this.bgm.isPaused) {
            this.bgm.resume();
        }
    }
}

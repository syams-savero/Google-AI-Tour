import * as Phaser from 'phaser';

export class AudioManager {
    private static bgm: Phaser.Sound.BaseSound | null = null;
    private static clickSound: Phaser.Sound.BaseSound | null = null;
    private static materialAudioCount = 0;
    private static activeSceneKey: string | null = null;

    static init(scene: Phaser.Scene) {
        if (this.bgm) return;
        if (scene.cache.audio.exists('bgm')) {
            this.bgm = scene.sound.add('bgm', { loop: true, volume: 0.2 });
        }
    }

    static setActiveScene(sceneKey: string) {
        this.activeSceneKey = sceneKey;
    }

    static playMusic(scene: Phaser.Scene) {
        this.setActiveScene(scene.scene.key);
        if (this.activeSceneKey === 'Map4Scene') {
            return;
        }
        if (!this.bgm && scene.cache.audio.exists('bgm')) {
            this.bgm = scene.sound.add('bgm', { loop: true, volume: 0.2 });
        }
        if (!this.bgm || this.materialAudioCount > 0) return;
        if (this.bgm.isPaused) {
            this.bgm.resume();
        } else if (!this.bgm.isPlaying) {
            this.bgm.play();
        }
    }

    static playClick(scene: Phaser.Scene) {
        if (!scene.cache.audio.exists('click')) return;
        scene.sound.play('click', { volume: 1.0 });
    }

    static pauseMusic() {
        if (this.bgm && this.bgm.isPlaying) {
            this.bgm.pause();
        }
    }

    static stopMusic() {
        if (this.bgm) {
            this.bgm.stop();
        }
    }

    static pauseForMaterial() {
        this.materialAudioCount += 1;
        this.pauseMusic();
    }

    static materialAudioFinished() {
        if (this.materialAudioCount <= 0) return;
        this.materialAudioCount -= 1;
        if (this.materialAudioCount === 0 && this.activeSceneKey !== 'Map4Scene') {
            if (this.bgm) {
                if (this.bgm.isPaused) {
                    this.bgm.resume();
                } else if (!this.bgm.isPlaying) {
                    this.bgm.play();
                }
            }
        }
    }
}

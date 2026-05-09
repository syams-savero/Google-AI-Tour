import * as Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        // Tempat load aset (background, karakter, dll)
    }

    create() {
        // Tempat membuat objek di game
        this.add.text(400, 300, 'CANVAS SIAP', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
    }

    update() {
        // Tempat logika perulangan game
    }
}

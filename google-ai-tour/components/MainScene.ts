import * as Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private gogoleNPC!: Phaser.GameObjects.Container;
    private gogoleSprite!: Phaser.GameObjects.Sprite;
    private gogoleShadow!: Phaser.GameObjects.Ellipse;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private dialogBox!: Phaser.GameObjects.Container;
    private dialogText!: Phaser.GameObjects.Text;

    private isNearGogole: boolean = false;

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('bg', '/assets/4.png');
        this.load.spritesheet('akii_full', '/assets/image copy 2.png', { frameWidth: 256, frameHeight: 268 });
        this.load.image('gogole_full', '/assets/gogole_sheet.png');
    }

    create() {
        // 1. Manual Frames untuk Gogole
        const texture = this.textures.get('gogole_full');
        texture.add('neutral', 0, 0, 0, 256, 256);
        texture.add('happy', 0, 0, 768, 256, 256);
        texture.add('wink', 0, 0, 512, 256, 256);
        texture.add('shock', 0, 256, 0, 256, 256);

        // 2. Setup Background (1920x1080)
        this.add.image(0, 0, 'bg').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // 3. NPC Gogole (Upgrade Visual)
        this.gogoleNPC = this.add.container(960, 500);

        // Bayangan Gogole
        this.gogoleShadow = this.add.ellipse(0, 100, 80, 20, 0x000000, 0.3);
        this.gogoleNPC.add(this.gogoleShadow);

        this.gogoleSprite = this.add.sprite(0, 0, 'gogole_full', 'neutral');
        this.gogoleSprite.setScale(0.4);
        this.gogoleNPC.add(this.gogoleSprite);

        // Efek Melayang & Bayangan Sinkron
        this.tweens.add({
            targets: this.gogoleSprite,
            y: '-=30',
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: this.gogoleShadow,
            scaleX: 0.7,
            alpha: 0.1,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Efek Miring (Tilting)
        this.tweens.add({
            targets: this.gogoleSprite,
            angle: { from: -5, to: 5 },
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Autocycle Expression (Hanya jika tidak sedang berinteraksi)
        this.time.addEvent({
            delay: 4000,
            callback: () => {
                if (!this.isNearGogole) {
                    this.gogoleSprite.setFrame('wink');
                    this.time.delayedCall(500, () => {
                        if (!this.isNearGogole) this.gogoleSprite.setFrame('neutral');
                    });
                }
            },
            loop: true
        });

        // 4. Player Akii
        this.player = this.physics.add.sprite(400, 600, 'akii_full', 0);
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.7);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        this.createAnims();
        this.add.text(960, 40, 'Dekati Gogole untuk bicara', {
            fontSize: '18px', color: '#ffcc00', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2000);

        this.createDialogUI();

        if (this.input.keyboard) this.cursors = this.input.keyboard.createCursorKeys();
    }

    private createAnims() {
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('akii_full', { start: 0, end: 3 }),
            frameRate: 10, repeat: -1
        });
    }

    private createDialogUI() {
        this.dialogBox = this.add.container(960, 950).setScrollFactor(0).setAlpha(0).setDepth(1000);
        const bg = this.add.rectangle(0, 0, 1000, 120, 0x000000, 0.8).setStrokeStyle(2, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '24px', color: '#ffffff', wordWrap: { width: 900 }
        }).setOrigin(0.5);
        this.dialogBox.add([bg, this.dialogText]);
    }

    update() {
        if (!this.player || !this.cursors) return;
        this.player.setVelocity(0);
        const speed = 400;
        let moving = this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown;

        if (this.cursors.left.isDown) { this.player.setVelocityX(-speed); this.player.setFlipX(true); }
        else if (this.cursors.right.isDown) { this.player.setVelocityX(speed); this.player.setFlipX(false); }
        if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
        else if (this.cursors.down.isDown) this.player.setVelocityY(speed);

        this.player.play('idle', true);

        // Interaction
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gogoleNPC.x, this.gogoleNPC.y);
        const nowNear = dist < 250;

        if (nowNear !== this.isNearGogole) {
            this.isNearGogole = nowNear;
            if (nowNear) {
                this.gogoleSprite.setFrame('happy');
                this.dialogText.setText("Halo Akii! Lihat deh, saya sekarang punya bayangan dan bisa miring-miring. Keren kan?");
                this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });
            } else {
                this.gogoleSprite.setFrame('neutral');
                this.tweens.add({ targets: this.dialogBox, alpha: 0, duration: 400 });
            }
        }
    }
}
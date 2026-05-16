import * as Phaser from 'phaser';

export class GeminiScene extends Phaser.Scene {
    private playerContainer!: Phaser.GameObjects.Container;
    private playerSprite!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private dialogBox!: Phaser.GameObjects.Container;
    private portraitSprite!: Phaser.GameObjects.Sprite;
    private gradientGraphics!: Phaser.GameObjects.Graphics;
    private dialogText!: Phaser.GameObjects.Text;
    private barriers!: Phaser.Physics.Arcade.StaticGroup;

    private playerName: string = "User"; // Will be passed from MainScene
    private isDialogActive: boolean = false;
    private isTyping: boolean = false;
    private fullText: string = "";
    private typeTimer?: Phaser.Time.TimerEvent;

    constructor() {
        super('GeminiScene');
    }

    init(data: { playerName: string }) {
        this.playerName = data.playerName || "User";
    }

    preload() {
        this.load.image('bg2', '/assets/Map2.png');
        this.load.image('player_robot', '/assets/gogole.png');
        this.load.image('dr_gemini', '/assets/robotGemini.png'); // Menggunakan robotGemini sebagai pendamping
        this.load.image('dr_gemini_portrait', '/assets/DrGemini.png');
    }

    create() {
        // 1. Setup Background (1920x1080)
        this.add.image(0, 0, 'bg2').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // 2. Player (Start dari Kiri karena baru masuk dari Lantai 1)
        this.playerContainer = this.add.container(100, 800);
        this.physics.world.enable(this.playerContainer);
        this.playerSprite = this.add.sprite(0, 0, 'player_robot');
        this.playerContainer.add(this.playerSprite);

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(80, 80);
        body.setOffset(-40, -40);

        this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);

        // Float Effect
        this.tweens.add({
            targets: this.playerSprite,
            y: '-=15',
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 3. Barriers (Tembok Gaib)
        this.barriers = this.physics.add.staticGroup();

        // Tembok Atas (Dinding)
        this.barriers.add(this.add.rectangle(960, 440, 1920, 80, 0x0000ff, 0));

        // Meja Kerja Besar di Tengah Bawah - Digeser lebih bawah & diperlebar
        this.barriers.add(this.add.rectangle(960, 980, 2000, 200, 0xff0000, 0));

        // Pot Tanaman (Kiri)
        this.barriers.add(this.add.rectangle(65, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(190, 940, 120, 100, 0x00ff00, 0));

        // Pot Tanaman (Kanan)
        this.barriers.add(this.add.rectangle(1730, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(1855, 940, 120, 100, 0x00ff00, 0));

        this.physics.add.collider(this.playerContainer, this.barriers);

        // 3.5. Pasukan Robot Gemini (Di depan TV Merah)
        const robotPositions = [
            { x: 280, y: 520 },  // TV 1 (Kiri)
            { x: 1160, y: 520 }, // TV 3 (Tengah Kanan)
            { x: 1680, y: 520 }  // TV 4 (Kanan Ujung)
        ];

        robotPositions.forEach((pos, index) => {
            const robot = this.add.sprite(pos.x, pos.y, 'dr_gemini').setScale(1.2);

            // Efek Melayang Berbeda-beda (biar lebih alami)
            this.tweens.add({
                targets: robot,
                y: pos.y - 15,
                duration: 1500 + (index * 200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        // 4. UI
        this.createDialogUI();

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-ENTER', () => {
                if (this.isTyping) this.completeTypewriter();
                else if (this.isDialogActive) this.handleInteraction();
            });
        }

        // Welcome Message Gemini Room
        this.time.delayedCall(1000, () => {
            this.isDialogActive = true;
            this.showDialog(`Selamat datang di Ruangan GEMINI, ${this.playerName}! Ini adalah pusat pemrosesan AI tercanggih kami.`);
        });
    }

    private handleInteraction() {
        this.closeDialog();
    }

    private showDialog(text: string) {
        this.fullText = text;
        this.dialogText.setText('');
        this.isTyping = true;
        this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 1, duration: 200 });

        // Show Gemini Portrait
        this.portraitSprite.setTexture('dr_gemini_portrait').setAlpha(1).setScale(6).setX(-600);

        if (this.typeTimer) this.typeTimer.remove();
        let charIndex = 0;
        this.typeTimer = this.time.addEvent({
            delay: 35,
            callback: () => {
                charIndex++;
                this.dialogText.setText(this.fullText.substring(0, charIndex));
                if (charIndex >= this.fullText.length) {
                    this.isTyping = false;
                    this.typeTimer = undefined;
                }
            },
            repeat: this.fullText.length
        });
    }

    private completeTypewriter() {
        if (this.typeTimer) this.typeTimer.remove();
        this.dialogText.setText(this.fullText);
        this.isTyping = false;
    }

    private closeDialog() {
        this.isDialogActive = false;
        this.tweens.add({ targets: this.dialogBox, alpha: 0, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 0, duration: 200 });
        this.portraitSprite.setAlpha(0);
    }

    private createDialogUI() {
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(999).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(1000);
        this.portraitSprite = this.add.sprite(-600, -320, 'dr_gemini_portrait').setScale(6).setAlpha(0);
        this.dialogBox.add(this.portraitSprite);

        const bg = this.add.rectangle(0, 0, 1500, 220, 0x000000, 0.8).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '42px', color: '#ffffff', wordWrap: { width: 1300 }, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.dialogBox.add([bg, this.dialogText]);
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;

        // TRANSISI BALIK KE LANTAI 1
        if (this.playerContainer.x < 40) {
            this.scene.start('MainScene');
            return;
        }

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        if (this.isDialogActive) return;

        const speed = 500;
        let vx = 0; let vy = 0;
        if (this.cursors.left.isDown) { vx = -1; this.playerSprite.setFlipX(true); }
        else if (this.cursors.right.isDown) { vx = 1; this.playerSprite.setFlipX(false); }
        if (this.cursors.up.isDown) vy = -1;
        else if (this.cursors.down.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) { const norm = Math.SQRT2; vx = (vx / norm) * speed; vy = (vy / norm) * speed; }
        else { vx *= speed; vy *= speed; }
        body.setVelocityX(vx); body.setVelocityY(vy);
    }
}

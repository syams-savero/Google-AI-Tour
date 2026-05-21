import * as Phaser from 'phaser';

export class Map4Scene extends Phaser.Scene {
    private playerContainer!: Phaser.GameObjects.Container;
    private playerSprite!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private playerName: string = 'User';

    private robotEnding!: Phaser.GameObjects.Sprite;
    private interactPrompt!: Phaser.GameObjects.Text;

    // UI Elements
    private dialogBox!: Phaser.GameObjects.Container;
    private dialogText!: Phaser.GameObjects.Text;
    private portraitSprite!: Phaser.GameObjects.Sprite;
    private isDialogActive: boolean = false;
    private gradientGraphics!: Phaser.GameObjects.Graphics;

    constructor() {
        super('Map4Scene');
    }

    init(data: any) {
        if (data.playerName) this.playerName = data.playerName;
    }

    preload() {
        this.load.image('map4_bg', '/assets/Map4.png');
        this.load.image('robot_ending', '/assets/robotEnding.png');
        this.load.image('player_robot', '/assets/player_robot.png'); // reuse player asset
        this.load.image('gogole_portrait', '/assets/portrait_gogole.png');
    }

    create() {
        // 1. Background
        this.add.image(960, 540, 'map4_bg');

        // 2. Robot Ending NPC
        this.robotEnding = this.add.sprite(960, 540, 'robot_ending').setScale(0.8);
        this.robotEnding.setDepth(540);

        // 3. Player Container
        this.playerContainer = this.add.container(200, 800);
        this.physics.world.enable(this.playerContainer);
        this.playerSprite = this.add.sprite(0, 0, 'player_robot');
        this.playerContainer.add(this.playerSprite);

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(80, 80);
        body.setOffset(-40, -40);

        // Camera setup - Fixed Camera for Map 4 as well to maintain premium look
        this.cameras.main.centerOn(960, 540);

        // Floating effect for player
        this.tweens.add({
            targets: this.playerSprite,
            y: '-=15',
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 4. UI Setup
        this.createDialogUI();

        this.interactPrompt = this.add.text(960, 400, '[ENTER] Bicara', {
            fontSize: '24px', color: '#ffffff', backgroundColor: '#4285F4', padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setAlpha(0).setDepth(2000);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-ENTER', () => {
                if (this.isDialogActive) return;
                const dist = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, this.robotEnding.x, this.robotEnding.y);
                if (dist < 200) {
                    this.startEndingDialogue();
                }
            });
        }
    }

    private createDialogUI() {
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(999).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(1000);
        const bg = this.add.rectangle(0, 0, 1500, 220, 0x000000, 0.8).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '42px', color: '#ffffff', wordWrap: { width: 1380, useAdvancedWrap: true }, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.portraitSprite = this.add.sprite(-600, -320, 'gogole_portrait').setScale(4.5);
        this.dialogBox.add([bg, this.dialogText, this.portraitSprite]);
    }

    private startEndingDialogue() {
        this.isDialogActive = true;
        this.tweens.add({ targets: [this.dialogBox, this.gradientGraphics], alpha: 1, duration: 300 });
        this.dialogText.setText(`Halo ${this.playerName}! Selamat kamu telah sampai di akhir perjalanan...`);
        this.portraitSprite.setAlpha(1);
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;
        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        if (this.isDialogActive) return;

        const speed = 500;
        let vx = 0, vy = 0;
        if (this.cursors.left.isDown) { vx = -1; this.playerSprite.setFlipX(true); }
        else if (this.cursors.right.isDown) { vx = 1; this.playerSprite.setFlipX(false); }
        if (this.cursors.up.isDown) vy = -1;
        else if (this.cursors.down.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) { const norm = 0.707; vx *= norm; vy *= norm; }
        body.setVelocityX(vx * speed);
        body.setVelocityY(vy * speed);

        this.playerContainer.setDepth(this.playerContainer.y);

        const dist = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, this.robotEnding.x, this.robotEnding.y);
        if (dist < 200) {
            this.interactPrompt.setAlpha(1).setPosition(this.robotEnding.x, this.robotEnding.y - 150);
        } else {
            this.interactPrompt.setAlpha(0);
        }
    }
}

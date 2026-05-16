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
    private interactPrompt!: Phaser.GameObjects.Text;
    private smallRobots: Phaser.GameObjects.Sprite[] = [];
    private drGeminiNPC!: Phaser.GameObjects.Sprite;
    private activeRobot: any = null;

    private playerName: string = "User";
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
        this.load.image('gogole_portrait', '/assets/gogoleSapa.png');
        this.load.image('robot_mini', '/assets/robotGemini.png');
        this.load.image('dr_gemini_portrait', '/assets/DrGemini.png');
    }

    create() {
        // 1. Setup Background
        this.add.image(0, 0, 'bg2').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // 2. Player
        this.playerContainer = this.add.container(100, 800);
        this.physics.world.enable(this.playerContainer);
        this.playerSprite = this.add.sprite(0, 0, 'player_robot');
        this.playerContainer.add(this.playerSprite);

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(80, 80).setOffset(-40, -40);

        this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);

        this.tweens.add({
            targets: this.playerSprite,
            y: '-=15',
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 3. Barriers
        this.barriers = this.physics.add.staticGroup();
        this.barriers.add(this.add.rectangle(960, 440, 1920, 80, 0x0000ff, 0));
        this.barriers.add(this.add.rectangle(960, 980, 2000, 200, 0xff0000, 0));
        this.barriers.add(this.add.rectangle(65, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(190, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(1730, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(1855, 940, 120, 100, 0x00ff00, 0));
        this.physics.add.collider(this.playerContainer, this.barriers);

        // Dr. Gemini NPC - Geser atas, kiri lagi, & Kecilin dikit (1.7)
        this.drGeminiNPC = this.add.sprite(780, 740, 'dr_gemini_portrait').setScale(1.7).setDepth(10);

        // Small Robots
        const robotPositions = [
            { x: 280, y: 520, info: `Halo ${this.playerName}, saat ini aku sedang coding pake Gemini nih!` },
            { x: 1160, y: 520, info: `Halo ${this.playerName}, aku lagi ngitung rumus matematika yang rumit banget pake bantuan Gemini!` },
            { x: 1680, y: 520, info: `Halo ${this.playerName}, aku lagi bikin jadwal proyek nih pake Gemini biar makin rapi.` }
        ];

        this.smallRobots = [];
        robotPositions.forEach((pos, index) => {
            const robot = this.add.sprite(pos.x, pos.y, 'robot_mini').setScale(1.2).setDepth(5);
            (robot as any).infoText = pos.info;
            this.smallRobots.push(robot);
            this.tweens.add({
                targets: robot,
                y: pos.y - 15,
                duration: 1500 + (index * 200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        this.createDialogUI();

        this.interactPrompt = this.add.text(0, 0, '[ENTER] Tanya', {
            fontSize: '20px', color: '#ffffff', backgroundColor: '#4285F4', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setAlpha(0).setDepth(2000).setScrollFactor(0);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-ENTER', () => {
                if (this.isTyping) this.completeTypewriter();
                else if (this.activeRobot && !this.isDialogActive) {
                    this.showDialog(this.activeRobot.infoText, 'none');
                }
                else if (this.isDialogActive) this.closeDialog();
            });
        }

        // Welcome Greeting
        this.time.delayedCall(1000, () => {
            if (!this.activeRobot && !this.isDialogActive)
                this.showDialog(`Selamat datang di Ruangan GEMINI, ${this.playerName}! Ini adalah pusat pemrosesan AI tercanggih kami.`, 'dr_gemini');
        });
    }

    private showDialog(text: string, speaker: 'gogole' | 'dr_gemini' | 'none') {
        this.isDialogActive = true;
        this.fullText = text;
        this.dialogText.setText('');
        this.isTyping = true;
        this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 1, duration: 200 });

        if (speaker === 'gogole') {
            this.portraitSprite.setTexture('gogole_portrait').setAlpha(1).setScale(6).setX(-600).setFlipX(false);
        } else if (speaker === 'dr_gemini') {
            this.portraitSprite.setTexture('dr_gemini_portrait').setAlpha(1).setScale(6).setX(600).setFlipX(false);
        } else {
            this.portraitSprite.setAlpha(0);
        }

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
        if (this.playerContainer.x < 40) { this.scene.start('MainScene'); return; }

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

        // DEPTH SORTING - Gogole Paling Atas (User Request)
        this.playerContainer.setDepth(9999);
        this.drGeminiNPC.setDepth(this.drGeminiNPC.y);
        this.smallRobots.forEach(robot => robot.setDepth(robot.y));

        // Proximity detection for small robots (Manual ENTER)
        let closestRobot: any = null;
        let minDist = 180;

        this.smallRobots.forEach(robot => {
            const dist = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, robot.x, robot.y);
            if (dist < minDist) {
                closestRobot = robot;
                minDist = dist;
            }
        });

        if (closestRobot) {
            this.activeRobot = closestRobot;
            const cam = this.cameras.main;
            const sx = (this.activeRobot.x - cam.scrollX) * cam.zoom;
            const sy = (this.activeRobot.y - 120 - cam.scrollY) * cam.zoom;
            this.interactPrompt.setPosition(sx, sy).setAlpha(1);
        } else {
            this.activeRobot = null;
            this.interactPrompt.setAlpha(0);
        }
    }
}

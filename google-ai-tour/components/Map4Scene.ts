import * as Phaser from 'phaser';
import { AudioManager } from './AudioManager';

export class Map4Scene extends Phaser.Scene {
    private playerContainer!: Phaser.GameObjects.Container;
    private playerSprite!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };
    private playerName: string = 'User';

    private robotEnding!: Phaser.GameObjects.Sprite;
    private interactPrompt!: Phaser.GameObjects.Image;

    // UI Elements (Standar Map 3)
    private dialogBox!: Phaser.GameObjects.Container;
    private dialogText!: Phaser.GameObjects.Text;
    private portraitSprite!: Phaser.GameObjects.Sprite;
    private gradientGraphics!: Phaser.GameObjects.Graphics;

    private isDialogActive: boolean = false;
    private isTyping: boolean = false;
    private fullText: string = "";
    private typeTimer?: Phaser.Time.TimerEvent;
    private dialogSequence: any[] = [];
    private currentDialogIndex: number = 0;

    constructor() {
        super('Map4Scene');
    }

    init(data: any) {
        if (data.playerName) this.playerName = data.playerName;
    }

    preload() {
        this.load.image('map4_bg', '/assets/Map4.png');
        this.load.image('robot_ending', '/assets/robotEnding.png');
        this.load.image('player_robot', '/assets/gogole.png');
        this.load.image('gogole_portrait', '/assets/gogoleSapa.png');
        if (!this.cache.audio.exists('bgm')) {
            this.load.audio('bgm', '/assets/Pixel Quest Parade.mp3');
        }
        this.load.image('interaksi_btn', '/assets/interaksi.png');
        this.load.audio('click', '/assets/click.mp3');
    }

    create() {
        // 1. Background
        this.add.image(960, 540, 'map4_bg').setDepth(0);

        // 2. Robot Ending NPC
        this.robotEnding = this.add.sprite(960, 550, 'robot_ending').setScale(0.35);
        this.robotEnding.setDepth(600);

        // Floating effect for robot ending
        this.tweens.add({
            targets: this.robotEnding,
            y: '-=15',
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 3. Player Container (Skala 1.0)
        this.playerContainer = this.add.container(200, 550);
        this.playerContainer.setDepth(10000);
        this.physics.world.enable(this.playerContainer);

        AudioManager.init(this);
        AudioManager.setActiveScene(this.scene.key);
        AudioManager.stopMusic();

        this.playerSprite = this.add.sprite(0, 0, 'player_robot').setScale(1.0);
        this.playerContainer.add(this.playerSprite);

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(80, 80);
        body.setOffset(-40, -40);

        // Camera setup
        this.cameras.main.centerOn(960, 540);

        // Floating effect for player (1.0 scale looks better with slightly faster float)
        this.tweens.add({
            targets: this.playerSprite,
            y: '-=12',
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 4. UI Setup
        this.createDialogUI();

        this.interactPrompt = this.add.image(0, 0, 'interaksi_btn')
            .setOrigin(0.5)
            .setScale(0.08)
            .setAlpha(0)
            .setDepth(20000);

        this.tweens.add({
            targets: this.interactPrompt,
            scale: 0.1,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasdKeys = this.input.keyboard.addKeys('W,A,S,D') as any;
            this.input.keyboard.on('keydown-ENTER', () => {
                if (this.isTyping) {
                    this.completeTypewriter();
                } else if (this.isDialogActive) {
                    this.advanceDialog();
                } else {
                    const dist = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, this.robotEnding.x, this.robotEnding.y);
                    if (dist < 200 && !this.isReadyForExit) {
                        this.startEndingSequence();
                    } else if (this.isReadyForExit && this.playerContainer.x > 1550) {
                        this.startFarewellSequence();
                    }
                }
            });
        }

        // Start Intro Monologue
        this.time.delayedCall(1000, () => {
            this.startSequence([
                { text: `tempat apa ini?`, speaker: 'gogole' },
                { text: `eh disitu ada robot penjaga, datengin yuk`, speaker: 'gogole' }
            ]);
        });
    }

    private createDialogUI() {
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(1001).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0, 0, 0, 0, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(20000);
        this.portraitSprite = this.add.sprite(-600, -320, 'player_robot').setScale(4.5).setAlpha(0);
        const bg = this.add.rectangle(0, 0, 1500, 220, 0, 0.9).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '32px', color: '#fff', wordWrap: { width: 1300 }, fontStyle: 'bold'
        }).setOrigin(0.5);

        this.dialogBox.add([this.portraitSprite, bg, this.dialogText]);
    }

    private isReadyForExit: boolean = false;

    private startEndingSequence() {
        this.startSequence([
            { text: `halo, Selamat kalian telah sampai di akhir perjalanan google ai tour ini`, speaker: 'ending' },
            { text: `kalian udah banyak belajar dari perjalanan ini bukan?`, speaker: 'ending' },
            { text: `dengan ilmu yang baru saja kalian pelajarin, kalian bisa membuat berbagai banyak hal seperti di atas dan bawahku ini`, speaker: 'ending' },
            { text: `kalian bisa bikn game, website, perintah suara, hitung matematika rumit, coding, bikin konten, dan masih banyak hal lagi`, speaker: 'ending' },
            { text: `perjalanan kalian baru dimulai sekarang, dan cshaya di depan adalah jalan untuk mewujudkan semua imajinasi kalian`, speaker: 'ending' },
            { text: `jadi, ayo wujudkan imajinasi mu!`, speaker: 'ending' },
            { text: `hmm menarik, ayo ${this.playerName} kita coba bersama!`, speaker: 'gogole' }
        ], () => {
            // Flag agar player bisa lanjut ke cahaya
            this.isReadyForExit = true;
        });
    }

    private startFarewellSequence() {
        this.robotEnding.setFlipX(true); // Robot hadap kanan saat perpisahan
        this.startSequence([
            { text: `selamat tinggal ${this.playerName}, wujudkan impian mu!`, speaker: 'ending' }
        ], () => {
            this.triggerFinalRedirect();
        });
    }

    private triggerFinalRedirect() {
        // Create full screen overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x0f172a, 1);
        overlay.fillRect(0, 0, 1920, 1080);
        overlay.setDepth(30000);
        overlay.setAlpha(0);

        // Ambient dark fade-in transition
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 1500,
            onComplete: () => {
                // Container for ending elements
                const endContainer = this.add.container(960, 500).setDepth(30100).setAlpha(0);

                // Gogole icon floating
                const logo = this.add.sprite(0, -180, 'player_robot').setScale(1.5);
                endContainer.add(logo);
                this.tweens.add({
                    targets: logo,
                    y: '-=15',
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Title
                const title = this.add.text(0, -50, 'Selamat! Kamu telah menyelesaikan Google AI Tour 🎉', {
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '44px',
                    color: '#ffffff',
                    align: 'center',
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                endContainer.add(title);

                // Subtitle
                const sub = this.add.text(0, 20, 'Kini saatnya untuk mewujudkan semua imajinasimu menjadi nyata.\nKlik tombol di bawah ini untuk memulai petualangan kodingmu di Google AI Studio!', {
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '24px',
                    color: '#94a3b8', // slate 400
                    align: 'center',
                    lineSpacing: 10
                }).setOrigin(0.5);
                endContainer.add(sub);

                // Custom Styled CTA Button (Google AI Blue color #1a73e8)
                const btnBg = this.add.graphics();
                btnBg.fillStyle(0x1a73e8, 1);
                // Draw a rounded rectangle centered locally at (0, 150)
                btnBg.fillRoundedRect(-250, 110, 500, 70, 16);
                endContainer.add(btnBg);

                const btnText = this.add.text(0, 145, 'Mulai di Google AI Studio 🚀', {
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '24px',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                endContainer.add(btnText);

                // Interactive zone for the button
                const clickZone = this.add.zone(0, 145, 500, 70).setInteractive({ useHandCursor: true });
                endContainer.add(clickZone);

                // Hover effects
                clickZone.on('pointerover', () => {
                    btnBg.clear();
                    btnBg.fillStyle(0x1557b0, 1); // Darker blue
                    btnBg.fillRoundedRect(-250, 110, 500, 70, 16);
                    btnText.setScale(1.05);
                });

                clickZone.on('pointerout', () => {
                    btnBg.clear();
                    btnBg.fillStyle(0x1a73e8, 1);
                    btnBg.fillRoundedRect(-250, 110, 500, 70, 16);
                    btnText.setScale(1);
                });

                clickZone.on('pointerdown', () => {
                    AudioManager.playClick(this);
                    // Open standard reliable pop-up in new tab
                    window.open('https://aistudio.google.com/', '_blank');
                });

                // Fade in the elements container
                this.tweens.add({
                    targets: endContainer,
                    alpha: 1,
                    duration: 1000
                });
            }
        });
    }

    private onSequenceComplete?: () => void;

    private startSequence(seq: any[], onComplete?: () => void) {
        this.dialogSequence = seq;
        this.currentDialogIndex = 0;
        this.onSequenceComplete = onComplete;
        this.advanceDialog();
    }

    private advanceDialog() {
        if (this.currentDialogIndex < this.dialogSequence.length) {
            const next = this.dialogSequence[this.currentDialogIndex];
            this.showDialog(next.text, next.speaker);
            this.currentDialogIndex++;
        } else {
            this.closeDialog();
            if (this.onSequenceComplete) {
                const cb = this.onSequenceComplete;
                this.onSequenceComplete = undefined;
                cb();
            }
        }
    }

    private showDialog(text: string, speaker: string) {
        this.isDialogActive = true;
        this.fullText = text;
        this.dialogText.setText('');
        AudioManager.playClick(this);
        this.isTyping = true;
        this.tweens.add({ targets: [this.dialogBox, this.gradientGraphics], alpha: 1, duration: 200 });

        if (speaker === 'gogole') {
            this.portraitSprite.setTexture('player_robot').setAlpha(1).setScale(4.5).setX(-600).setFlipX(true);
        } else {
            this.portraitSprite.setTexture('robot_ending').setAlpha(1).setScale(0.8).setX(600).setFlipX(false);
        }

        if (this.typeTimer) this.typeTimer.remove();
        let charIndex = 0;
        this.typeTimer = this.time.addEvent({
            delay: 30,
            callback: () => {
                charIndex++;
                this.dialogText.setText(this.fullText.substring(0, charIndex));
                if (charIndex >= this.fullText.length) {
                    this.isTyping = false;
                    this.typeTimer = undefined;
                }
            },
            repeat: this.fullText.length - 1
        });
    }

    private completeTypewriter() {
        if (this.typeTimer) this.typeTimer.remove();
        this.dialogText.setText(this.fullText);
        this.isTyping = false;
    }

    private closeDialog() {
        this.isDialogActive = false;
        this.tweens.add({ targets: [this.dialogBox, this.gradientGraphics], alpha: 0, duration: 200 });
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;
        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        // Lock Y position to 550 (Horizontal movement only)
        this.playerContainer.y = 550;

        if (this.isDialogActive) return;

        const speed = 500;
        let vx = 0;
        if (this.cursors.left.isDown || this.wasdKeys.A.isDown) { vx = -1; this.playerSprite.setFlipX(true); }
        else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) { vx = 1; this.playerSprite.setFlipX(false); }

        body.setVelocityX(vx * speed);
        body.setVelocityY(0); // Ensure Y velocity is always 0

        this.playerContainer.setDepth(this.playerContainer.y);

        const dist = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, this.robotEnding.x, this.robotEnding.y);
        if (dist < 200 && !this.isReadyForExit) {
            this.interactPrompt.setAlpha(1).setPosition(this.robotEnding.x, this.robotEnding.y - 150);
        } else if (this.isReadyForExit && this.playerContainer.x > 1550) {
            this.interactPrompt.setAlpha(1).setPosition(1570, 380);
        } else {
            this.interactPrompt.setAlpha(0);
        }
    }
}

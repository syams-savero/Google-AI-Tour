import * as Phaser from 'phaser';

export class Map3Scene extends Phaser.Scene {
    private playerContainer!: Phaser.GameObjects.Container;
    private playerSprite!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // UI & NPCs
    private dialogBox!: Phaser.GameObjects.Container;
    private dialogText!: Phaser.GameObjects.Text;
    private interactPrompt!: Phaser.GameObjects.Text;

    private robotNano!: Phaser.GameObjects.Sprite;
    private robotTTS!: Phaser.GameObjects.Sprite;
    private robotStudio!: Phaser.GameObjects.Sprite;
    private cleaningRobot!: Phaser.GameObjects.Sprite;

    // Trashes
    private trash1!: Phaser.GameObjects.Sprite;
    private trash2!: Phaser.GameObjects.Sprite;
    private trash3!: Phaser.GameObjects.Sprite;

    private playerName: string = "User";

    constructor() {
        super('Map3Scene');
    }

    init(data: { playerName: string }) {
        this.playerName = data.playerName || "User";
    }

    preload() {
        this.load.image('bg3', '/assets/Map3.png');
        this.load.image('player_robot', '/assets/gogole.png');

        // NPC Assets baru dari kamu
        this.load.image('nano_asset', '/assets/robotBanana.png');
        this.load.image('tts_asset', '/assets/robotTTS.png');
        this.load.image('studio_asset', '/assets/robotAiStudio.png');

        // Trash Assets
        this.load.image('trash_foto', '/assets/sampahFoto.png');
        this.load.image('trash_kertas', '/assets/sampahKertas.png');
        this.load.image('trash_minuman', '/assets/sampahMinuman.png');

        // Cleaner Bot (Untuk nanti)
        this.load.image('cleaner_back', '/assets/robotPembersihHadapBelakang.png');
        this.load.image('cleaner_side', '/assets/robotPembersihHadapSamping.png');
    }

    create() {
        // Setup Map
        this.add.image(0, 0, 'bg3').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // Player (Spawn posisi masuk)
        this.playerContainer = this.add.container(150, 800);
        this.physics.world.enable(this.playerContainer);
        this.playerSprite = this.add.sprite(0, 0, 'player_robot');
        this.playerContainer.add(this.playerSprite);

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(80, 80).setOffset(-40, -40);

        this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);

        // Floating Effect Player
        this.tweens.add({
            targets: this.playerSprite,
            y: '-=15',
            duration: 1500,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // --- PLACING ROBOTS (Shifted to Right) ---
        // Stand 1: Nano (600, 520)
        this.robotNano = this.add.sprite(530, 510, 'nano_asset').setScale(0.32).setDepth(510);
        this.robotTTS = this.add.sprite(1150, 520, 'tts_asset').setScale(0.3).setDepth(520);
        this.robotStudio = this.add.sprite(1780, 520, 'studio_asset').setScale(0.4).setDepth(520);

        // NPC Effects
        [this.robotNano, this.robotTTS, this.robotStudio].forEach((robot, i) => {
            this.tweens.add({
                targets: robot,
                y: '-=10',
                duration: 1500 + (i * 200),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });

        // --- PLACING TRASHES ---
        this.trash1 = this.add.sprite(700, 850, 'trash_foto').setScale(0.6).setDepth(850);
        this.trash2 = this.add.sprite(1200, 700, 'trash_kertas').setScale(0.4).setDepth(700);
        this.trash3 = this.add.sprite(1500, 900, 'trash_minuman').setScale(0.6).setDepth(900);

        // --- PLACING CLEANER ROBOT (Corner) ---
        this.cleaningRobot = this.add.sprite(1800, 900, 'cleaner_side').setScale(1.0).setDepth(900);

        // Controls
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        console.log("Map 3 Updated with new Assets & Positions!");
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;

        // No Reverse Rule
        if (this.playerContainer.x < 100) this.playerContainer.x = 100;

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        const speed = 500;
        let vx = 0, vy = 0;
        if (this.cursors.left.isDown) { vx = -1; this.playerSprite.setFlipX(true); }
        else if (this.cursors.right.isDown) { vx = 1; this.playerSprite.setFlipX(false); }
        if (this.cursors.up.isDown) vy = -1;
        else if (this.cursors.down.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) { const norm = 0.707; vx *= norm; vy *= norm; }
        body.setVelocityX(vx * speed);
        body.setVelocityY(vy * speed);

        this.playerContainer.setDepth(9999);
    }
}

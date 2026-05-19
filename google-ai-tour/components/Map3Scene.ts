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
        this.load.image('npc_robot', '/assets/robotGemini.png');
    }

    create() {
        // Setup Map
        this.add.image(0, 0, 'bg3').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // Player Container (Spawn di sebelah kiri pintu masuk)
        this.playerContainer = this.add.container(200, 800);
        this.physics.world.enable(this.playerContainer);
        this.playerSprite = this.add.sprite(0, 0, 'player_robot');
        this.playerContainer.add(this.playerSprite);

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(80, 80).setOffset(-40, -40);

        this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);

        // Floating Effect for Player
        this.tweens.add({
            targets: this.playerSprite,
            y: '-=15',
            duration: 1500,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // 3 Robot Stands (Visual Placement Only)
        // Posisi ini bisa kamu kabari kalau mau geser
        this.robotNano = this.add.sprite(480, 520, 'npc_robot').setScale(1.2).setDepth(520);   // Stand 1
        this.robotTTS = this.add.sprite(960, 520, 'npc_robot').setScale(1.2).setDepth(520);    // Stand 2
        this.robotStudio = this.add.sprite(1440, 520, 'npc_robot').setScale(1.2).setDepth(520); // Stand 3

        // Floating Effect for NPCs
        [this.robotNano, this.robotTTS, this.robotStudio].forEach((robot, i) => {
            this.tweens.add({
                targets: robot,
                y: '-=10',
                duration: 1500 + (i * 200),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });

        // Setup Controls
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        console.log(`Map 3 Ready! Player: ${this.playerName}`);
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;

        // No Reverse Rule (Nggak bisa balik ke Map 2 sebelah kiri)
        if (this.playerContainer.x < 100) {
            this.playerContainer.x = 100;
        }

        // Logic Gerakan Player
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

        this.playerContainer.setDepth(this.playerContainer.y);
    }
}

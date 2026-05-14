import * as Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private professorNPC!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private dialogBox!: Phaser.GameObjects.Container;
    private portraitSprite!: Phaser.GameObjects.Sprite;
    private gradientGraphics!: Phaser.GameObjects.Graphics; // FIX: pakai Graphics bukan Sprite
    private dialogText!: Phaser.GameObjects.Text;
    private barriers!: Phaser.Physics.Arcade.StaticGroup;

    private playerName: string = "User";
    private activeNPC: 'gogole' | 'professor' | null = null;

    private choiceButtons!: Phaser.GameObjects.Container;
    private selectedChoice: 'ya' | 'tidak' = 'ya';
    private btnYa!: Phaser.GameObjects.Text;
    private btnTidak!: Phaser.GameObjects.Text;
    private isWaitingForFollowup: boolean = false;
    private followupIndex: number = 0;
    private followupDialogs: string[] = [
        "Yaudah yuk, langsung aja kita mulai. Setelah ini kamu akan langsung dipandu dengan Gogole.",
        "Silahkan masuk ke pintu di sebelah kanan ini."
    ];

    private isNearProfessor: boolean = false;
    private interactPrompt!: Phaser.GameObjects.Text;
    private isDialogActive: boolean = false;
    private currentDialogIndex: number = 0;

    private gogoleDialogs: string[] = [
        "Haloo! Nama kamu siapa?",
        "Halo {name}, namaku Gogole!",
        "Namaku Kedengeran aneh ya? ini gara-gara si profesor buru-buru waktu ngasih nama jadinya salah ketik deh.",
        "oh ya, Aku ini Robot baru yang diciptakan khusus untuk ngajak kamu jalan-jalan di kantor google ini loh.",
        "dan uniknya, kamu tidak perlu repot repot datang kesini, kamu bahkan bisa kontrol aku cukup dari rumah dan kita bisa jalan-jalan bareng di kantor google ini.",
        "disana ada profesor tuh, yuk datengin dulu!"
    ];

    private professorDialogs: string[] = [
        "Haloo {name}, Saya profesor di kantor ini yang memimpin perkembangan teknologi AI disini..",
        "kira-kira kamu udah tau belum setelah ini kita mau ngapain?"
    ];

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('bg', '/assets/Map1Aseli.png');
        this.load.image('player_robot', '/assets/1_transparent.png');
        this.load.image('professor', '/assets/9_transparent.png');
        this.load.image('gogole_portrait', '/assets/6_transparent.png');
        // FIX: '10.png' dihapus dari preload karena gradient sekarang pakai Graphics
    }

    create() {
        // 1. Setup Background (1920x1080)
        this.add.image(0, 0, 'bg').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // 2. NPC Profesor — jauh di kanan meja
        this.professorNPC = this.physics.add.sprite(1450, 490, 'professor');
        this.professorNPC.setScale(1.5).setDepth(10);
        this.professorNPC.setImmovable(true);

        // 3. Player (Robot Google)
        this.player = this.physics.add.sprite(400, 800, 'player_robot');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(1);
        this.player.setBodySize(60, 20);
        this.player.setOffset(34, 108);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 4. Barriers (Tembok Gaib)
        this.barriers = this.physics.add.staticGroup();

        // --- Tembok Atas Full-Width (turun ke Y=490 agar pas di kaki dinding) ---
        this.barriers.add(this.add.rectangle(960, 490, 1920, 80, 0x0000ff, 0));

        // --- Benda-benda Dinding Atas ---
        this.barriers.add(this.add.rectangle(155, 540, 95, 120, 0x00ff00, 0));   // Tanaman Kiri Atas
        this.barriers.add(this.add.rectangle(272, 540, 125, 120, 0x00ff00, 0));  // Printer
        this.barriers.add(this.add.rectangle(960, 575, 540, 150, 0xff0000, 0));  // Meja Utama
        this.barriers.add(this.add.rectangle(1150, 540, 55, 110, 0x00ff00, 0));  // Dispenser
        this.barriers.add(this.add.rectangle(1727, 540, 150, 150, 0x00ff00, 0)); // Rak Buku

        // --- Pot Bawah (Y=1010 agar tepat di bagian pot) ---
        [155, 345, 535, 725, 915, 1105, 1295, 1485, 1675, 1865].forEach(x => {
            this.barriers.add(this.add.rectangle(x, 1010, 115, 80, 0x00ff00, 0));
        });

        this.physics.add.collider(this.player, this.barriers);

        this.createDialogUI();
        this.createChoiceUI();

        // Prompt Interaksi
        this.interactPrompt = this.add.text(960, 380, '[ENTER] Bicara', {
            fontSize: '20px', color: '#ffffff', backgroundColor: '#4285F4', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setAlpha(0).setDepth(2000);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();

            this.input.keyboard.on('keydown-ENTER', () => {
                if (this.choiceButtons.alpha > 0) {
                    this.handleChoice(this.selectedChoice);
                } else if (this.isDialogActive) {
                    this.handleInteraction();
                } else if (this.isNearProfessor) {
                    this.activeNPC = 'professor';
                    this.handleInteraction();
                }
            });

            this.input.keyboard.on('keydown-LEFT', () => {
                if (this.choiceButtons.alpha > 0) this.updateChoiceSelection('ya');
            });
            this.input.keyboard.on('keydown-RIGHT', () => {
                if (this.choiceButtons.alpha > 0) this.updateChoiceSelection('tidak');
            });
        }

        this.time.delayedCall(1000, () => this.startIntro());

        this.input.on('pointerdown', () => {
            window.focus();
        });
    }

    private startIntro() {
        this.isDialogActive = true;
        this.activeNPC = 'gogole';
        this.currentDialogIndex = 0;
        this.nextDialogStep();
    }

    private handleInteraction() {
        if (this.isWaitingForFollowup) {
            if (this.followupIndex < this.followupDialogs.length) {
                this.showDialog(this.followupDialogs[this.followupIndex]);
                this.followupIndex++;
                this.interactPrompt.setAlpha(0);
                this.time.delayedCall(500, () => {
                    if (this.isDialogActive) this.interactPrompt.setAlpha(1);
                });
            } else {
                this.isWaitingForFollowup = false;
                this.closeDialog();
            }
            return;
        }

        if (this.isDialogActive) {
            this.currentDialogIndex++;
            this.nextDialogStep();
            return;
        }

        this.isDialogActive = true;
        this.currentDialogIndex = 0;
        this.interactPrompt.setAlpha(0);
        this.nextDialogStep();
    }

    private nextDialogStep() {
        const dialogs = this.activeNPC === 'gogole' ? this.gogoleDialogs : this.professorDialogs;

        if (this.currentDialogIndex < dialogs.length) {
            let text = dialogs[this.currentDialogIndex].replace('{name}', this.playerName);
            this.showDialog(text);

            // FIX: Validasi nama — tidak bisa lanjut kalau kosong
            if (this.activeNPC === 'gogole' && this.currentDialogIndex === 0) {
                this.time.delayedCall(500, () => {
                    const askName = () => {
                        const nameInput = window.prompt("Masukkan nama kamu (tidak boleh kosong):");
                        if (!nameInput || nameInput.trim() === '') {
                            // Tanya lagi, tidak bisa lanjut
                            this.time.delayedCall(100, askName);
                            return;
                        }
                        this.playerName = nameInput.trim();
                        this.currentDialogIndex++;
                        this.nextDialogStep();
                    };
                    askName();
                });
            }

            // Logic khusus Profesor: Pilihan di index terakhir
            if (this.activeNPC === 'professor' && this.currentDialogIndex === 1) {
                this.choiceButtons.setAlpha(1);
                this.updateChoiceSelection('ya');
            }
        } else {
            this.closeDialog();
        }
    }

    private updateChoiceSelection(choice: 'ya' | 'tidak') {
        this.selectedChoice = choice;
        if (choice === 'ya') {
            this.btnYa.setAlpha(1).setScale(1.2);
            this.btnTidak.setAlpha(0.6).setScale(1);
        } else {
            this.btnYa.setAlpha(0.6).setScale(1);
            this.btnTidak.setAlpha(1).setScale(1.2);
        }
    }

    private handleChoice(choice: 'ya' | 'tidak') {
        this.choiceButtons.setAlpha(0);
        let response = "";
        if (choice === 'ya') {
            response = "Wah peka juga ya kamu, kita akan jalan-jalan di kantor ini sambil liat-liat teknologi AI terbaru loh!";
        } else {
            response = "Ah iya sih wajar kalau belum tau, jadi kita disini akan jalan-jalan buat liat-liat perkembangan teknologi AI terbaru dari google loh. Terdengar asik bukan?";
        }

        this.showDialog(response);

        this.time.delayedCall(2000, () => {
            this.isWaitingForFollowup = true;
            this.followupIndex = 0;
            this.interactPrompt.setAlpha(1).setText('[ENTER] Lanjut');
        });
    }

    private createChoiceUI() {
        // Pindah ke Kanan Atas Kotak Dialog (Box di 920, Top-nya sekitar 810)
        this.choiceButtons = this.add.container(1500, 810).setAlpha(0).setDepth(2000).setScrollFactor(0);

        this.btnYa = this.add.text(-120, 0, ' [ YA ] ', {
            fontSize: '36px',
            backgroundColor: '#0F9D58',
            padding: { x: 20, y: 10 },
            fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleChoice('ya'));

        this.btnTidak = this.add.text(120, 0, ' [ TIDAK ] ', {
            fontSize: '36px',
            backgroundColor: '#DB4437',
            padding: { x: 20, y: 10 },
            fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleChoice('tidak'));

        this.choiceButtons.add([this.btnYa, this.btnTidak]);
    }

    private showDialog(text: string) {
        this.dialogText.setText(text);
        this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });

        // FIX: Tampilkan gradient Graphics
        this.tweens.add({ targets: this.gradientGraphics, alpha: 1, duration: 200 });

        if (this.activeNPC === 'gogole') {
            this.portraitSprite.setTexture('gogole_portrait').setAlpha(1).setX(-500);
            this.professorNPC.setAlpha(0);
        } else {
            this.portraitSprite.setAlpha(0); // Sesuai request: Sembunyikan portrait Profesor
            this.professorNPC.setAlpha(1);
        }
    }

    private closeDialog() {
        this.isDialogActive = false;
        this.tweens.add({ targets: this.dialogBox, alpha: 0, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 0, duration: 200 }); // FIX
        this.choiceButtons.setAlpha(0);
        this.portraitSprite.setAlpha(0);
        this.professorNPC.setAlpha(1);
        if (this.isNearProfessor) this.interactPrompt.setAlpha(1);
        this.activeNPC = null;
    }

    private createDialogUI() {
        // FIX: Gradient pakai Graphics, bukan image '10.png'
        // Ini bikin gradasi hitam transparan dari bawah layar — tidak bergantung pada asset apapun
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(999).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(1000);

        // Portrait karakter (Gogole atau Profesor)
        this.portraitSprite = this.add.sprite(-500, -320, 'gogole_portrait').setScale(6).setAlpha(0);
        this.dialogBox.add(this.portraitSprite);

        const bg = this.add.rectangle(0, 0, 1500, 220, 0x000000, 0.8).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '48px', color: '#ffffff', wordWrap: { width: 1300 }, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.dialogBox.add([bg, this.dialogText]);
    }

    update() {
        if (!this.player || !this.cursors) return;
        this.player.setVelocity(0);

        if (this.isDialogActive) return;

        const speed = 400;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        }

        // Y-Sorting: player di depan profesor kalau Y lebih bawah, di belakang kalau lebih atas
        if (this.player.y > this.professorNPC.y) {
            this.player.setDepth(this.professorNPC.depth + 1);
        } else {
            this.player.setDepth(this.professorNPC.depth - 1);
        }

        // Interaction Detection
        const distProfessor = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.professorNPC.x, this.professorNPC.y);
        const nowNearProfessor = distProfessor < 250;

        if (nowNearProfessor !== this.isNearProfessor) {
            this.isNearProfessor = nowNearProfessor;
            if (nowNearProfessor) {
                if (!this.isDialogActive) {
                    this.interactPrompt.setAlpha(1);
                    this.interactPrompt.setPosition(this.professorNPC.x, this.professorNPC.y - 100);
                }
            } else {
                if (this.activeNPC === 'professor') this.closeDialog();
                this.interactPrompt.setAlpha(0);
            }
        }
    }
}
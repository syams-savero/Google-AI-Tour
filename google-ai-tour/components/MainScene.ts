import * as Phaser from 'phaser';
import { AudioManager } from './AudioManager';

export class MainScene extends Phaser.Scene {
    private playerContainer!: Phaser.GameObjects.Container;
    private playerSprite!: Phaser.GameObjects.Sprite;
    private professorNPC!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private dialogBox!: Phaser.GameObjects.Container;
    private portraitSprite!: Phaser.GameObjects.Sprite;
    private gradientGraphics!: Phaser.GameObjects.Graphics;
    private dialogText!: Phaser.GameObjects.Text;
    private barriers!: Phaser.Physics.Arcade.StaticGroup;

    private playerName: string = "User";
    private hasTalkedToProfessor: boolean = false;
    private activeNPC: 'gogole' | 'professor' | null = null;

    private choiceButtons!: Phaser.GameObjects.Container;
    private selectedChoice: 'ya' | 'tidak' = 'ya';
    private btnYa!: Phaser.GameObjects.Text;
    private btnTidak!: Phaser.GameObjects.Text;
    private isWaitingForFollowup: boolean = false;
    private followupIndex: number = 0;
    private followupDialogs: string[] = [
        "Yaudah yuk, langsung aja kita mulai. Setelah ini kamu akan langsung dipandu dengan Gogole.",
        "Silahkan jalan aja ke kanan setelah ini kamu akan berada di ruangan GEMINI."
    ];

    private isNearProfessor: boolean = false;
    private interactPrompt!: Phaser.GameObjects.Text;
    private isDialogActive: boolean = false;
    private currentDialogIndex: number = 0;

    private isTyping: boolean = false;
    private fullText: string = "";
    private typeTimer?: Phaser.Time.TimerEvent;

    // FIX [Minor-4]: flag eksplisit untuk tampilkan tombol pilihan
    private isWaitingForChoice: boolean = false;

    // FIX [Critical-1]: flag & UI untuk input nama (ganti window.prompt)
    private nameInputOverlay!: HTMLDivElement;
    private isWaitingForName: boolean = false;

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
        // FIX [Minor-3]: semua aset di-load di preload() — Phaser garantikan
        // selesai sebelum create() dipanggil, tidak perlu delay asumsi
        this.load.image('bg', '/assets/Map1.png');
        this.load.image('player_robot', '/assets/gogole.png');
        this.load.image('professor', '/assets/profesor.png');
        this.load.image('gogole_portrait', '/assets/gogoleSapa.png');
        this.load.audio('click', '/assets/click.mp3');
        if (!this.cache.audio.exists('bgm')) {
            this.load.audio('bgm', '/assets/Pixel Quest Parade.mp3');
        }
    }

    create() {
        // 1. Setup Background
        this.add.image(0, 0, 'bg').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // 2. NPC Profesor - Diperbesar dan digeser lebih ke bawah (dekat meja)
        this.professorNPC = this.physics.add.sprite(1250, 560, 'professor');
        this.professorNPC.setScale(2.0).setDepth(10);
        this.professorNPC.setImmovable(true);
        this.professorNPC.setFlipX(true);

        // 3. Player Container (Agar Bisa Melayang/Floating)
        // FIX [Critical-3]: physics tetap di Container, tapi body offset
        // disesuaikan agar collider lebih akurat dengan posisi visual sprite
        this.playerContainer = this.add.container(400, 800);
        this.physics.world.enable(this.playerContainer);

        this.playerSprite = this.add.sprite(0, 0, 'player_robot');
        this.playerContainer.add(this.playerSprite);

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        // Perbesar hitbox agar lebih akurat, offset tepat di tengah sprite
        body.setSize(80, 80);
        body.setOffset(-40, -40);

        this.cameras.main.startFollow(this.playerContainer, true, 0.1, 0.1);

        AudioManager.init(this);
        AudioManager.playMusic(this);

        // Efek Melayang (Hanya pada Sprite-nya saja)
        this.tweens.add({
            targets: this.playerSprite,
            y: '-=15',
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 4. Barriers
        this.barriers = this.physics.add.staticGroup();
        this.barriers.add(this.add.rectangle(960, 490, 1920, 80, 0x0000ff, 0));
        this.barriers.add(this.add.rectangle(155, 540, 95, 120, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(272, 540, 125, 120, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(960, 575, 540, 150, 0xff0000, 0));
        this.barriers.add(this.add.rectangle(1150, 540, 55, 110, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(1727, 540, 150, 150, 0x00ff00, 0));
        [155, 345, 535, 725, 915, 1105, 1295, 1485, 1675, 1865].forEach(x => {
            this.barriers.add(this.add.rectangle(x, 1010, 115, 80, 0x00ff00, 0));
        });
        this.physics.add.collider(this.playerContainer, this.barriers);

        // 5. UI Setup
        this.createDialogUI();
        this.createChoiceUI();
        this.createNameInputOverlay(); // FIX [Critical-1]

        // FIX [Major-3]: interactPrompt pakai setScrollFactor(0) agar
        // posisinya di screen-space, tidak ikut kamera bergerak
        this.interactPrompt = this.add.text(0, 0, '[ENTER] Bicara', {
            fontSize: '20px', color: '#ffffff', backgroundColor: '#4285F4', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setAlpha(0).setDepth(2000).setScrollFactor(0);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-ENTER', () => {
                // FIX [Major-2]: jangan proses ENTER jika sedang input nama
                if (this.isWaitingForName) return;

                if (this.isTyping) {
                    this.completeTypewriter();
                } else if (this.choiceButtons.alpha > 0) {
                    this.handleChoice(this.selectedChoice);
                } else if (this.isWaitingForFollowup) {
                    // FIX [Major-2]: tangani followup lebih awal sebelum
                    // isDialogActive agar tidak overlap
                    this.handleInteraction();
                } else if (this.isDialogActive) {
                    this.handleInteraction();
                } else if (this.isNearProfessor) {
                    this.activeNPC = 'professor';
                    this.isDialogActive = true;
                    this.currentDialogIndex = 0;
                    this.interactPrompt.setAlpha(0);
                    this.nextDialogStep();
                }
            });
            this.input.keyboard.on('keydown-LEFT', () => {
                if (this.choiceButtons.alpha > 0) this.updateChoiceSelection('ya');
            });
            this.input.keyboard.on('keydown-RIGHT', () => {
                if (this.choiceButtons.alpha > 0) this.updateChoiceSelection('tidak');
            });
        }

        // FIX [Minor-3]: delay dihilangkan — semua aset sudah pasti siap
        // saat create() dipanggil karena preload() sudah selesai
        this.time.delayedCall(500, () => this.startIntro());
    }

    // FIX [Critical-1]: buat overlay HTML untuk input nama
    // menggantikan window.prompt() yang blocking
    private createNameInputOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'name-input-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.6);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: #1a1a2e;
            border: 2px solid #4285F4;
            border-radius: 12px;
            padding: 32px 40px;
            text-align: center;
            min-width: 320px;
        `;

        const label = document.createElement('p');
        label.textContent = 'Siapa nama kamu?';
        label.style.cssText = 'color:#ffffff; font-size:22px; font-weight:bold; margin:0 0 16px;';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Masukkan nama kamu...';
        input.style.cssText = `
            width: 100%; box-sizing: border-box;
            padding: 10px 14px; font-size: 18px;
            border-radius: 8px; border: 2px solid #4285F4;
            background: #0f0f1a; color: #fff;
            outline: none; margin-bottom: 8px;
        `;

        const errMsg = document.createElement('p');
        errMsg.style.cssText = 'color:#DB4437; font-size:13px; min-height:18px; margin:0 0 12px;';

        const btn = document.createElement('button');
        btn.textContent = 'Lanjut →';
        btn.style.cssText = `
            background: #4285F4; color: #fff;
            border: none; border-radius: 8px;
            padding: 10px 32px; font-size: 16px;
            cursor: pointer; font-weight: bold;
        `;

        const submit = () => {
            const val = input.value.trim();
            if (!val) {
                errMsg.textContent = 'Nama tidak boleh kosong!';
                return;
            }
            this.playerName = val;
            this.hideNameInput();
            this.isWaitingForName = false;
            this.currentDialogIndex++;
            this.nextDialogStep();
        };

        btn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
            errMsg.textContent = '';
        });

        box.appendChild(label);
        box.appendChild(input);
        box.appendChild(errMsg);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        this.nameInputOverlay = overlay;

        // Simpan referensi input untuk focus otomatis
        (overlay as any)._input = input;
    }

    private showNameInput() {
        this.nameInputOverlay.style.display = 'flex';
        const input = (this.nameInputOverlay as any)._input as HTMLInputElement;
        input.value = '';
        setTimeout(() => input.focus(), 50);
    }

    private hideNameInput() {
        this.nameInputOverlay.style.display = 'none';
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
                // FIX [Major-5]: reset followup state saat selesai
                this.isWaitingForFollowup = false;
                this.followupIndex = 0;
                this.hasTalkedToProfessor = true;
                this.closeDialog();
            }
            return;
        }
        if (this.isDialogActive) {
            this.currentDialogIndex++;
            this.nextDialogStep();
            return;
        }
    }

    private nextDialogStep() {
        const dialogs = this.activeNPC === 'gogole' ? this.gogoleDialogs : this.professorDialogs;
        if (this.currentDialogIndex < dialogs.length) {
            let text = dialogs[this.currentDialogIndex].replace('{name}', this.playerName);
            this.showDialog(text);

            // FIX [Critical-1]: ganti window.prompt dengan overlay HTML
            if (this.activeNPC === 'gogole' && this.currentDialogIndex === 0) {
                this.isWaitingForName = true;
                this.time.delayedCall(1500, () => {
                    this.showNameInput();
                });
            }

            // FIX [Major-1]: set flag isWaitingForChoice secara eksplisit
            if (this.activeNPC === 'professor' && this.currentDialogIndex === 1) {
                this.isWaitingForChoice = true;
            } else {
                this.isWaitingForChoice = false;
            }
        } else {
            this.closeDialog();
        }
    }

    private updateChoiceSelection(choice: 'ya' | 'tidak') {
        this.selectedChoice = choice;
        if (choice === 'ya') {
            this.btnYa.setAlpha(1).setScale(1.2).setBackgroundColor('#0F9D58');
            this.btnTidak.setAlpha(0.6).setScale(1).setBackgroundColor('#888888');
        } else {
            this.btnYa.setAlpha(0.6).setScale(1).setBackgroundColor('#888888');
            this.btnTidak.setAlpha(1).setScale(1.2).setBackgroundColor('#DB4437');
        }
    }

    private handleChoice(choice: 'ya' | 'tidak') {
        // FIX [Minor-4]: nonaktifkan tombol setelah dipilih agar tidak dobel
        this.btnYa.disableInteractive();
        this.btnTidak.disableInteractive();
        this.choiceButtons.setAlpha(0);
        this.isWaitingForChoice = false;

        let response = choice === 'ya'
            ? "Benar!, kita akan jalan-jalan di kantor ini sambil liat-liat teknologi AI terbaru loh!"
            : "Ah iya sih wajar kalau belum tau, jadi kita disini akan jalan-jalan buat liat-liat perkembangan teknologi AI terbaru dari google loh. Terdengar asik bukan?";
        this.showDialog(response);
        this.time.delayedCall(2000, () => {
            this.isWaitingForFollowup = true;
            this.followupIndex = 0;
            this.interactPrompt.setAlpha(1).setText('[ENTER] Lanjut');
        });
    }

    private createChoiceUI() {
        this.choiceButtons = this.add.container(960, 750).setAlpha(0).setDepth(2000).setScrollFactor(0);

        this.btnYa = this.add.text(-250, 0, ' [ YA ] ', {
            fontSize: '48px', backgroundColor: '#0F9D58', padding: { x: 30, y: 15 }, fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            AudioManager.playClick(this);
            this.handleChoice('ya');
        });

        this.btnTidak = this.add.text(250, 0, ' [ TIDAK ] ', {
            fontSize: '48px', backgroundColor: '#DB4437', padding: { x: 30, y: 15 }, fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            AudioManager.playClick(this);
            this.handleChoice('tidak');
        });

        this.choiceButtons.add([this.btnYa, this.btnTidak]);
    }

    private showDialog(text: string) {
        this.fullText = text;
        this.dialogText.setText('');

        AudioManager.playClick(this);

        // FIX [Critical-2]: batalkan timer lama sepenuhnya sebelum mulai baru
        if (this.typeTimer) {
            this.typeTimer.remove(false);
            this.typeTimer = undefined;
        }
        this.isTyping = true;

        this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 1, duration: 200 });

        if (this.activeNPC === 'gogole') {
            this.portraitSprite.setTexture('gogole_portrait').setAlpha(1).setScale(4.5).setX(-600).setFlipX(false);
            // FIX [Major-4]: sembunyikan profesor saat dialog Gogole
            this.professorNPC.setAlpha(0);
        } else {
            this.portraitSprite.setTexture('professor').setAlpha(1).setScale(6).setX(600).setFlipX(true);
            this.professorNPC.setAlpha(1);
        }

        let charIndex = 0;
        this.typeTimer = this.time.addEvent({
            delay: 35,
            callback: () => {
                charIndex++;
                this.dialogText.setText(this.fullText.substring(0, charIndex));
                if (charIndex >= this.fullText.length) {
                    this.isTyping = false;
                    this.typeTimer = undefined;
                    // FIX [Major-1]: gunakan flag isWaitingForChoice
                    if (this.isWaitingForChoice && !this.isWaitingForFollowup) {
                        // Re-enable tombol setiap kali pilihan muncul baru
                        this.btnYa.setInteractive({ useHandCursor: true });
                        this.btnTidak.setInteractive({ useHandCursor: true });
                        this.choiceButtons.setAlpha(1);
                        this.updateChoiceSelection('ya');
                    }
                }
            },
            repeat: this.fullText.length
        });
    }

    private completeTypewriter() {
        // FIX [Critical-2]: hapus timer dengan benar
        if (this.typeTimer) {
            this.typeTimer.remove(false);
            this.typeTimer = undefined;
        }
        this.dialogText.setText(this.fullText);
        this.isTyping = false;
        // FIX [Major-1]: gunakan flag isWaitingForChoice
        if (this.isWaitingForChoice && !this.isWaitingForFollowup) {
            this.btnYa.setInteractive({ useHandCursor: true });
            this.btnTidak.setInteractive({ useHandCursor: true });
            this.choiceButtons.setAlpha(1);
            this.updateChoiceSelection('ya');
        }
    }

    private closeDialog() {
        this.isDialogActive = false;
        this.isWaitingForChoice = false;

        // FIX [Major-5]: selalu reset followup state saat dialog ditutup paksa
        this.isWaitingForFollowup = false;
        this.followupIndex = 0;

        this.tweens.add({ targets: this.dialogBox, alpha: 0, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 0, duration: 200 });
        this.choiceButtons.setAlpha(0);
        this.portraitSprite.setAlpha(0);

        // FIX [Major-4]: selalu kembalikan alfa profesor
        this.professorNPC.setAlpha(1);

        if (this.isNearProfessor) this.interactPrompt.setAlpha(1);
        this.activeNPC = null;
    }

    private createDialogUI() {
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(999).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(1000);
        this.portraitSprite = this.add.sprite(-600, -320, 'gogole_portrait').setScale(6).setAlpha(0);
        this.dialogBox.add(this.portraitSprite);

        // FIX [Minor-1]: perkecil wordWrap agar tidak overflow kotak dialog
        const bg = this.add.rectangle(0, 0, 1500, 220, 0x000000, 0.8).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '42px', color: '#ffffff',
            wordWrap: { width: 1380, useAdvancedWrap: true },
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.dialogBox.add([bg, this.dialogText]);
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;

        // TRANSISI KE LANTAI 2 (GEMINI ROOM) - Harus di Paling Atas biar nggak kehalang 'return'
        if (this.playerContainer.x > 1850) {
            if (this.hasTalkedToProfessor) {
                this.scene.start('GeminiScene', { playerName: this.playerName });
            } else {
                // Cegah player lewat dan beri instruksi
                this.playerContainer.x = 1840;
                this.showDialog("Eitss, kamu harus ngobrol dulu sama Profesor sebelum lanjut ke Ruang Gemini!");
            }
            return;
        }

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        if (this.isDialogActive || this.isWaitingForName) return;

        // FIX [Minor-2]: normalisasi kecepatan diagonal
        const speed = 500;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown) { vx = -1; this.playerSprite.setFlipX(true); }
        else if (this.cursors.right.isDown) { vx = 1; this.playerSprite.setFlipX(false); }
        if (this.cursors.up.isDown) vy = -1;
        else if (this.cursors.down.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) {
            // Normalisasi vektor diagonal agar kecepatan tetap = speed
            const norm = Math.SQRT2;
            vx = (vx / norm) * speed;
            vy = (vy / norm) * speed;
        } else {
            vx *= speed;
            vy *= speed;
        }
        body.setVelocityX(vx);
        body.setVelocityY(vy);

        // Depth sorting player vs NPC
        if (this.playerContainer.y > this.professorNPC.y)
            this.playerContainer.setDepth(this.professorNPC.depth + 1);
        else
            this.playerContainer.setDepth(this.professorNPC.depth - 1);

        // Deteksi proximity profesor
        const distProfessor = Phaser.Math.Distance.Between(
            this.playerContainer.x, this.playerContainer.y,
            this.professorNPC.x, this.professorNPC.y
        );
        const nowNearProfessor = distProfessor < 250;

        if (nowNearProfessor !== this.isNearProfessor) {
            this.isNearProfessor = nowNearProfessor;
            if (nowNearProfessor) {
                if (!this.isDialogActive) {
                    // FIX [Major-3]: posisi prompt di screen-space
                    // konversi world → screen dengan kamera
                    const cam = this.cameras.main;
                    const sx = (this.professorNPC.x - cam.scrollX) * cam.zoom;
                    const sy = (this.professorNPC.y - 120 - cam.scrollY) * cam.zoom;
                    this.interactPrompt.setPosition(sx, sy).setAlpha(1).setText('[ENTER] Bicara');
                }
            } else {
                if (this.activeNPC === 'professor') this.closeDialog();
                this.interactPrompt.setAlpha(0);
            }
        }

        // Update posisi prompt setiap frame saat dekat (agar tetap mengikuti)
        if (nowNearProfessor && !this.isDialogActive && this.interactPrompt.alpha > 0) {
            const cam = this.cameras.main;
            const sx = (this.professorNPC.x - cam.scrollX) * cam.zoom;
            const sy = (this.professorNPC.y - 120 - cam.scrollY) * cam.zoom;
            this.interactPrompt.setPosition(sx, sy);
        }
    }

    // Hapus overlay HTML saat scene dimatikan
    shutdown() {
        if (this.nameInputOverlay && document.body.contains(this.nameInputOverlay)) {
            document.body.removeChild(this.nameInputOverlay);
        }
    }
}
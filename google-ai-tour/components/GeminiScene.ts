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
    private isNearDrGemini: boolean = false;
    private isNearGreenTV: boolean = false;

    private playerName: string = "User";
    private isDialogActive: boolean = false;
    private isTyping: boolean = false;
    private fullText: string = "";
    private typeTimer?: Phaser.Time.TimerEvent;

    // Quest Sequence Data
    // 0: Awal
    // 1: Sudah intro, pergi ke TV (prompt pertama)
    // 2: Sudah lapor prompt 1, pergi ke Dr. Gemini (kritik)
    // 3: Sudah dikritik, pergi ke TV (prompt kedua)
    // 4: Sudah lapor prompt 2, pergi ke Dr. Gemini (selesai)
    // 5: Selesai
    private questState: number = 0;

    // FIX: Tambah callback opsional yang dipanggil setelah sequence dialog selesai
    private onSequenceComplete?: () => void;

    // GEMINI API KEY — isi di sini atau pakai env variable
    private readonly GEMINI_API_KEY: string = "";

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
        this.load.image('dr_gemini_bingung', '/assets/DrGeminiBingung.png');
    }

    create() {
        this.add.image(0, 0, 'bg2').setOrigin(0, 0);
        this.physics.world.setBounds(0, 0, 1920, 1080);
        this.cameras.main.setBounds(0, 0, 1920, 1080);

        // Player
        this.playerContainer = this.add.container(400, 800);
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
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // Barriers
        this.barriers = this.physics.add.staticGroup();
        this.barriers.add(this.add.rectangle(960, 440, 1920, 80, 0x0000ff, 0));
        this.barriers.add(this.add.rectangle(960, 980, 2000, 200, 0xff0000, 0));
        this.barriers.add(this.add.rectangle(65, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(190, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(1730, 940, 120, 100, 0x00ff00, 0));
        this.barriers.add(this.add.rectangle(1855, 940, 120, 100, 0x00ff00, 0));
        this.physics.add.collider(this.playerContainer, this.barriers);

        // Dr. Gemini NPC
        this.drGeminiNPC = this.add.sprite(780, 740, 'dr_gemini_portrait').setScale(1.7).setDepth(740);

        // Small robots
        const robotPositions = [
            { x: 280, y: 520, info: `Halo ${this.playerName}, saat ini aku sedang coding pake Gemini nih!` },
            { x: 1160, y: 520, info: `Halo ${this.playerName}, aku lagi ngitung rumus matematika yang rumit banget pake bantuan Gemini!` },
            { x: 1680, y: 520, info: `Halo ${this.playerName}, aku lagi bikin jadwal proyek nih pake Gemini biar makin rapi.` }
        ];

        this.smallRobots = [];
        robotPositions.forEach((pos, index) => {
            const robot = this.add.sprite(pos.x, pos.y, 'robot_mini').setScale(1.2).setDepth(pos.y);
            (robot as any).infoText = pos.info;
            this.smallRobots.push(robot);
            this.tweens.add({
                targets: robot,
                y: pos.y - 15,
                duration: 1500 + (index * 200),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        });

        this.createDialogUI();

        // FIX: interactPrompt pakai setScrollFactor(0) dan posisi diatur lewat camera space dengan benar
        this.interactPrompt = this.add.text(0, 0, '[ENTER]', {
            fontSize: '20px', color: '#ffffff', backgroundColor: '#4285F4', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setAlpha(0).setDepth(2000).setScrollFactor(0);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-ENTER', () => {
                if (this.isTyping) {
                    this.completeTypewriter();
                } else if (this.isDialogActive) {
                    this.advanceDialog();
                } else if (this.isNearDrGemini) {
                    this.handleDrGeminiInteraction();
                } else if (this.isNearGreenTV && (this.questState === 1 || this.questState === 3)) {
                    this.showGeminiInterface();
                } else if (this.activeRobot) {
                    // FIX: small robot dialog juga pakai startSequence
                    this.startSequence(
                        [{ text: this.activeRobot.infoText, speaker: 'none' }]
                    );
                }
            });
        }
    }

    // FIX: startSequence sekarang terima optional callback yang dipanggil setelah sequence selesai
    private startSequence(
        seq: { text: string, speaker: 'gogole' | 'dr_gemini' | 'none', action?: string }[],
        onComplete?: () => void
    ) {
        this.dialogSequence = [];
        this.currentDialogIndex = 0;
        this.onSequenceComplete = onComplete;
        this.dialogSequence = seq;
        this.advanceDialog();
    }

    private dialogSequence: { text: string, speaker: 'gogole' | 'dr_gemini' | 'none', action?: string }[] = [];
    private currentDialogIndex: number = 0;

    private handleDrGeminiInteraction() {
        if (this.isDialogActive) return;

        if (this.questState === 0) {
            // Intro → setelah selesai, state jadi 1
            this.startSequence([
                { text: `Halo ${this.playerName}! Selamat datang di Gemini Lab...`, speaker: 'dr_gemini' },
                { text: `Tahukah kamu gemini ini AI dari google yang overpower banget lohh`, speaker: 'dr_gemini' },
                { text: `dia bisa cari informasi terbaru, Analisa, coding, bikin gambar, video, hingga akses ke seluruh ekosistem di google. hebat bukan?`, speaker: 'dr_gemini' },
                { text: `wihh keren ya`, speaker: 'gogole' },
                { text: `tentu saja, teknologi ini lama banget dikembangkan hingga bisa jadi seperti ini`, speaker: 'dr_gemini' },
                { text: `Oh ya, bisa bantu aku?`, speaker: 'dr_gemini' },
                { text: `bantu apa?`, speaker: 'gogole' },
                { text: `Tolong buatin teks untuk poster tentang pentingnya literasi dong`, speaker: 'dr_gemini' },
                { text: `eh? gimana caranya?`, speaker: 'gogole' },
                { text: `di sebelah sana ada tv komputer nomor dua, pakai aja lalu tanya gemini untuk membuatkan teks nya`, speaker: 'dr_gemini' },
                { text: `Ah oke deh`, speaker: 'gogole' }
            ], () => {
                // FIX: state transition ada di callback, bukan di advanceDialog()
                this.questState = 1;
            });

        } else if (this.questState === 1) {
            // FIX: Kalau player ngobrol Dr. Gemini sebelum ke TV, kasih hint
            this.startSequence([
                { text: `Ayo cepat, pergi ke TV komputer dan tanya Gemini dulu!`, speaker: 'dr_gemini' }
            ]);

        } else if (this.questState === 2) {
            // Kritik → setelah selesai, state jadi 3
            this.startSequence([
                { text: `eh kok hasilnya gini sih? rasanya kurang`, speaker: 'dr_gemini' },
                { text: `waduh, kurang gimana?`, speaker: 'gogole' },
                { text: `teks nya terlalu biasa gitu rasanya`, speaker: 'dr_gemini' },
                { text: `Coba kamu nge prompt nya pakai format "Powerful Prompt" deh.`, speaker: 'dr_gemini' },
                { text: `Kasih Gemini sebuah ROLE (Peran), tentukan GOAL (Tujuan), beri CONTEXT (Konteks), dan atur VIBE nya.`, speaker: 'dr_gemini' },
                { text: `Dengan format itu, Gemini bakal ngasih hasil yang jauh lebih sakti!`, speaker: 'dr_gemini' },
                { text: `ah okedeh kucoba lagi`, speaker: 'gogole' }
            ], () => {
                // FIX: state 2 → 3 terjadi setelah dialog Dr. Gemini selesai
                this.questState = 3;
            });

        } else if (this.questState === 3) {
            // FIX: Kalau player ngobrol Dr. Gemini sebelum ke TV untuk prompt kedua
            this.startSequence([
                { text: `Ingat, pakai format Powerful Prompt ya! ROLE, GOAL, CONTEXT, dan VIBE!`, speaker: 'dr_gemini' }
            ]);

        } else if (this.questState === 4) {
            // Selesai → setelah selesai, state jadi 5
            this.startSequence([
                { text: `Wahh ini baru mantapp bangett!!`, speaker: 'dr_gemini' },
                { text: `teks nya jadi lebih padat, jelas dan kreatif bgt.`, speaker: 'dr_gemini' },
                { text: `hehe keren kan?`, speaker: 'gogole' },
                // FIX: showCertificate dipindah ke callback setelah dialog selesai semua
                { text: `kalau gitu ini aku kasih sertifikat kemenangan buat kamu`, speaker: 'dr_gemini' },
                { text: `kamu bisa lanjut ke map selanjutnya ya, pintu disebelah kanan sudah terbuka`, speaker: 'dr_gemini' },
                { text: `oke siap grak!`, speaker: 'gogole' }
            ], () => {
                // FIX: sertifikat muncul setelah semua dialog selesai
                this.questState = 5;
                this.showCertificateOverlay();
            });
        }
        // questState === 5: tidak ada dialog, player tinggal jalan ke kanan
    }

    private advanceDialog() {
        if (this.currentDialogIndex < this.dialogSequence.length) {
            const next = this.dialogSequence[this.currentDialogIndex];
            this.showDialog(next.text, next.speaker);
            this.currentDialogIndex++;
        } else {
            // FIX: closeDialog dulu, lalu panggil callback kalau ada
            this.closeDialog();
            if (this.onSequenceComplete) {
                const cb = this.onSequenceComplete;
                this.onSequenceComplete = undefined;
                cb();
            }
        }
    }

    private showDialog(text: string, speaker: 'gogole' | 'dr_gemini' | 'none') {
        this.isDialogActive = true;
        this.fullText = text;
        this.dialogText.setText('');
        this.isTyping = true;
        this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 1, duration: 200 });

        if (speaker === 'gogole') {
            this.portraitSprite.setTexture('gogole_portrait').setAlpha(1).setScale(6).setX(-600).setFlipX(false).setDepth(5);
        } else if (speaker === 'dr_gemini') {
            // FIX: texture bingung dipakai saat questState 2 sudah aktif saat dialog dimulai
            const texture = (this.questState === 2) ? 'dr_gemini_bingung' : 'dr_gemini_portrait';
            this.portraitSprite.setTexture(texture).setAlpha(1).setScale(6).setX(600).setFlipX(false).setDepth(5);
        } else {
            this.portraitSprite.setAlpha(0);
        }

        if (this.typeTimer) this.typeTimer.remove();
        let charIndex = 0;
        // FIX: repeat pakai fullText.length - 1 agar tidak overflow
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
        this.tweens.add({ targets: this.dialogBox, alpha: 0, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 0, duration: 200 });
        this.portraitSprite.setAlpha(0);
    }

    private async callGeminiAPI(prompt: string): Promise<string> {
        if (!this.GEMINI_API_KEY) {
            return (this.questState === 1)
                ? "Buku adalah gudang ilmu, membaca adalah kuncinya. Literasi itu penting agar kita pintar."
                : "SAYA ADALAH ASISTEN LITERASI. Berikut teks poster Anda: \n\n'LITERASI: Jendela Masa Depan. Bukalah satu buku dan biarkan imajinasimu terbang melewati cakrawala berpikir. Ayo Membaca!'";
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: 100 }
                    })
                }
            );
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (err) {
            console.error("Gemini API Error:", err);
            return "Maaf, koneksi ke Gemini terputus. Coba lagi nanti!";
        }
    }

    private showGeminiInterface() {
        // FIX: Cegah buka overlay kalau sudah ada
        if (document.getElementById('gemini-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'gemini-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; font-family: 'Inter', sans-serif;
        `;
        overlay.innerHTML = `
            <div style="width:800px;height:600px;background:#131314;border-radius:24px;border:1px solid #333;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:20px;border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between;">
                    <span style="color:#fff;font-size:24px;font-weight:600;">Gemini <span style="font-size:14px;opacity:0.5;">v1.5 Flash</span></span>
                    <button id="close-gemini" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:24px;">&times;</button>
                </div>
                <div id="chat-area" style="flex:1;padding:20px;overflow-y:auto;color:#fff;">
                    <div style="color:#888;font-style:italic;">Ada yang bisa saya bantu, ${this.playerName}?</div>
                    ${this.questState === 3 ? `<div style="color:#9B72CB;margin-top:10px;">💡 Tips: Coba format <b>Powerful Prompt</b> — sebutkan ROLE, GOAL, CONTEXT, dan VIBE kamu!</div>` : ''}
                </div>
                <div style="padding:20px;background:#1e1f20;">
                    <div style="display:flex;gap:10px;background:#2b2d2f;padding:10px 20px;border-radius:100px;">
                        <input id="gemini-input" placeholder="Ketik prompt poster literasi di sini..." 
                            style="flex:1;background:none;border:none;color:#fff;outline:none;">
                        <button id="submit-prompt" 
                            style="background:#4285F4;border:none;color:#fff;padding:5px 20px;border-radius:100px;cursor:pointer;">
                            Kirim
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const chatArea = overlay.querySelector('#chat-area') as HTMLDivElement;
        const input = overlay.querySelector('#gemini-input') as HTMLInputElement;
        const submitBtn = overlay.querySelector('#submit-prompt') as HTMLButtonElement;
        const closeBtn = overlay.querySelector('#close-gemini') as HTMLButtonElement;

        // FIX: cleanup overlay dari DOM saat ditutup
        const cleanupOverlay = () => {
            if (document.body.contains(overlay)) overlay.remove();
        };

        closeBtn.onclick = cleanupOverlay;

        // FIX: Support Enter key di input field
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitBtn.click();
        });

        submitBtn.onclick = async () => {
            const prompt = input.value.trim();
            if (!prompt) return;

            // Disable input selama loading
            input.disabled = true;
            submitBtn.disabled = true;

            chatArea.innerHTML += `
                <div style="margin-top:20px;color:#4285F4;">Kamu:</div>
                <div>${prompt}</div>
            `;
            input.value = '';
            chatArea.innerHTML += `<div id="ai-loading" style="color:#9B72CB;margin-top:10px;">Gemini sedang menulis...</div>`;
            chatArea.scrollTop = chatArea.scrollHeight;

            const response = await this.callGeminiAPI(prompt);

            const loading = overlay.querySelector('#ai-loading');
            if (loading) loading.remove();

            chatArea.innerHTML += `
                <div style="margin-top:20px;color:#9B72CB;">Gemini:</div>
                <div style="white-space:pre-wrap;">${response}</div>
                <button id="report-btn" style="margin-top:15px;background:#222;border:1px solid #4285F4;color:#4285F4;padding:8px 16px;border-radius:5px;cursor:pointer;">
                    Laporkan ke Dr. Gemini
                </button>
            `;
            chatArea.scrollTop = chatArea.scrollHeight;

            // Re-enable input untuk percobaan lain
            input.disabled = false;
            submitBtn.disabled = false;

            const reportBtn = overlay.querySelector('#report-btn') as HTMLButtonElement;
            reportBtn.onclick = () => {
                cleanupOverlay();

                if (this.questState === 1) {
                    // FIX: state 1 → 2, lalu startSequence gogole lapor
                    // state 2 → 3 akan terjadi setelah dialog Dr. Gemini di questState 2 selesai
                    this.questState = 2;
                    this.startSequence([{
                        text: `Hasil pertama sudah aku catat. Ayo lapor ke Dr. Gemini!`,
                        speaker: 'gogole'
                    }]);
                } else if (this.questState === 3) {
                    // FIX: state 3 → 4, lalu startSequence gogole lapor
                    // state 4 → 5 akan terjadi setelah dialog Dr. Gemini di questState 4 selesai
                    this.questState = 4;
                    this.startSequence([{
                        text: `Hasil kedua jauh lebih bagus! Dr. Gemini pasti suka.`,
                        speaker: 'gogole'
                    }]);
                }
            };
        };
    }

    private showCertificateOverlay() {
        // FIX: Cegah duplikat overlay
        if (document.getElementById('certificate-overlay')) return;

        const cert = document.createElement('div');
        cert.id = 'certificate-overlay';
        cert.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; justify-content: center;
            align-items: center; z-index: 11000;
        `;
        cert.innerHTML = `
            <div style="width:600px;padding:40px;background:#fff;border:15px solid #4285F4;text-align:center;border-radius:10px;">
                <h1 style="color:#4285F4;margin:0;">SERTIFIKAT</h1>
                <p>Pahlawan Literasi Digital</p>
                <div style="margin:20px 0;border-top:1px solid #ddd;padding-top:20px;">
                    <h2 style="color:#DB4437;">${this.playerName}</h2>
                    <p>Selamat atas keberhasilanmu menggunakan AI secara bijak!</p>
                </div>
                <button id="close-cert" style="background:#4285F4;color:#fff;border:none;padding:10px 30px;border-radius:5px;cursor:pointer;">
                    Tutup
                </button>
            </div>
        `;
        document.body.appendChild(cert);

        const closeBtn = cert.querySelector('#close-cert') as HTMLButtonElement;
        closeBtn.onclick = () => {
            if (document.body.contains(cert)) cert.remove();
        };
    }

    private createDialogUI() {
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(1001).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(1002);
        this.portraitSprite = this.add.sprite(-600, -320, 'dr_gemini_portrait').setScale(6).setAlpha(0);
        this.dialogBox.add(this.portraitSprite);

        const bg = this.add.rectangle(0, 0, 1500, 220, 0x000000, 0.9).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '32px', color: '#ffffff',
            wordWrap: { width: 1300 }, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.dialogBox.add([bg, this.dialogText]);
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;

        // Cek exit conditions
        if (this.questState === 5 && this.playerContainer.x > 1880) {
            this.cleanupDOMOverlays();
            this.scene.start('MainScene');
            return;
        }
        if (this.playerContainer.x < 40) {
            this.cleanupDOMOverlays();
            this.scene.start('MainScene');
            return;
        }

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        if (this.isDialogActive) return;

        const speed = 500;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown) { vx = -1; this.playerSprite.setFlipX(true); }
        else if (this.cursors.right.isDown) { vx = 1; this.playerSprite.setFlipX(false); }
        if (this.cursors.up.isDown) vy = -1;
        else if (this.cursors.down.isDown) vy = 1;

        if (vx !== 0 && vy !== 0) { const norm = Math.SQRT1_2; vx *= norm; vy *= norm; }
        body.setVelocityX(vx * speed);
        body.setVelocityY(vy * speed);

        // Depth sorting
        this.playerContainer.setDepth(9999);
        this.drGeminiNPC.setDepth(this.drGeminiNPC.y);
        this.smallRobots.forEach(robot => robot.setDepth(robot.y));

        // Proximity checks
        const distDr = Phaser.Math.Distance.Between(
            this.playerContainer.x, this.playerContainer.y,
            this.drGeminiNPC.x, this.drGeminiNPC.y
        );
        this.isNearDrGemini = distDr < 150;

        const distTV = Phaser.Math.Distance.Between(
            this.playerContainer.x, this.playerContainer.y,
            750, 520
        );
        this.isNearGreenTV = distTV < 150;

        // FIX: Small robot proximity check
        this.activeRobot = null;
        for (const robot of this.smallRobots) {
            const distRobot = Phaser.Math.Distance.Between(
                this.playerContainer.x, this.playerContainer.y,
                robot.x, robot.y
            );
            if (distRobot < 150) {
                this.activeRobot = robot;
                break;
            }
        }

        // FIX: interactPrompt posisi pakai worldToScreen yang benar tanpa kali zoom manual
        const cam = this.cameras.main;
        if (this.isNearDrGemini) {
            const screenX = (this.drGeminiNPC.x - cam.scrollX);
            const screenY = (this.drGeminiNPC.y - 120 - cam.scrollY);
            this.interactPrompt.setText('[ENTER] Bicara').setPosition(screenX, screenY).setAlpha(1);
        } else if (this.isNearGreenTV && (this.questState === 1 || this.questState === 3)) {
            const screenX = (750 - cam.scrollX);
            const screenY = (520 - 120 - cam.scrollY);
            this.interactPrompt.setText('[ENTER] Gunakan Gemini').setPosition(screenX, screenY).setAlpha(1);
        } else if (this.activeRobot) {
            const screenX = (this.activeRobot.x - cam.scrollX);
            const screenY = (this.activeRobot.y - 100 - cam.scrollY);
            this.interactPrompt.setText('[ENTER] Sapa').setPosition(screenX, screenY).setAlpha(1);
        } else {
            this.interactPrompt.setAlpha(0);
        }
    }

    // FIX: cleanup semua DOM overlay kalau scene di-shutdown
    private cleanupDOMOverlays() {
        const geminiOverlay = document.getElementById('gemini-overlay');
        if (geminiOverlay) geminiOverlay.remove();
        const certOverlay = document.getElementById('certificate-overlay');
        if (certOverlay) certOverlay.remove();
    }

    // Dipanggil Phaser saat scene di-shutdown
    shutdown() {
        this.cleanupDOMOverlays();
    }
}
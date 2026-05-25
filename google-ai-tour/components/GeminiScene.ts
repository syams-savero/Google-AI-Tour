import * as Phaser from 'phaser';
import { AudioManager } from './AudioManager';

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

    private onSequenceComplete?: () => void;
    private dialogSequence: { text: string, speaker: 'gogole' | 'dr_gemini' | 'none', action?: string }[] = [];
    private currentDialogIndex: number = 0;

    // API Key dari .env.local — wajib prefix NEXT_PUBLIC_ untuk Next.js
    private readonly GEMINI_API_KEY: string = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

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
        if (!this.cache.audio.exists('bgm')) {
            this.load.audio('bgm', '/assets/Pixel Quest Parade.mp3');
        }
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

        AudioManager.init(this);
        AudioManager.playMusic(this);

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
                    this.startSequence([{ text: this.activeRobot.infoText, speaker: 'none' }]);
                }
            });
        }
    }

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

    private handleDrGeminiInteraction() {
        if (this.isDialogActive) return;

        if (this.questState === 0) {
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
            ], () => { this.questState = 1; });

        } else if (this.questState === 1) {
            this.startSequence([
                { text: `Ayo cepat, pergi ke TV komputer dan tanya Gemini dulu!`, speaker: 'dr_gemini' }
            ]);

        } else if (this.questState === 2) {
            this.startSequence([
                { text: `eh kok hasilnya gini sih? rasanya kurang`, speaker: 'dr_gemini' },
                { text: `waduh, kurang gimana?`, speaker: 'gogole' },
                { text: `teks nya terlalu biasa gitu rasanya`, speaker: 'dr_gemini' },
                { text: `Coba kamu nge prompt nya pakai format "Powerful Prompt" deh.`, speaker: 'dr_gemini' },
                { text: `Kasih Gemini sebuah ROLE (Peran), tentukan GOAL (Tujuan), beri CONTEXT (Konteks), dan atur VIBE nya.`, speaker: 'dr_gemini' },
                { text: `Dengan format itu, Gemini bakal ngasih hasil yang jauh lebih sakti!`, speaker: 'dr_gemini' },
                { text: `ah okedeh kucoba lagi`, speaker: 'gogole' }
            ], () => { this.questState = 3; });

        } else if (this.questState === 3) {
            this.startSequence([
                { text: `Ingat, pakai format Powerful Prompt ya! ROLE, GOAL, CONTEXT, dan VIBE!`, speaker: 'dr_gemini' }
            ]);

        } else if (this.questState === 4) {
            this.startSequence([
                { text: `Wahh ini baru mantapp bangett!!`, speaker: 'dr_gemini' },
                { text: `teks nya jadi lebih padat, jelas dan kreatif bgt.`, speaker: 'dr_gemini' },
                { text: `hehe keren kan?`, speaker: 'gogole' },
                { text: `Kamu udah belajar cara prompt yang bener. Keren banget!`, speaker: 'dr_gemini' },
                { text: `kamu bisa lanjut ke map selanjutnya ya, pintu disebelah kanan sudah terbuka`, speaker: 'dr_gemini' },
                { text: `oke siap grak!`, speaker: 'gogole' }
            ], () => {
                console.log("Quest Gemini Selesai! questState = 5. Silakan ke kanan map.");
                this.questState = 5;
            });
        }
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

    private showDialog(text: string, speaker: 'gogole' | 'dr_gemini' | 'none') {
        this.isDialogActive = true;
        this.fullText = text;
        this.dialogText.setText('');
        this.isTyping = true;
        this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 1, duration: 200 });

        if (speaker === 'gogole') {
            this.portraitSprite.setTexture('gogole_portrait').setAlpha(1).setScale(4.5).setX(-600).setY(80).setFlipX(false).setDepth(20005);
        } else if (speaker === 'dr_gemini') {
            const texture = (this.questState === 2) ? 'dr_gemini_bingung' : 'dr_gemini_portrait';
            this.portraitSprite.setTexture(texture).setAlpha(1).setScale(6).setX(600).setFlipX(false).setDepth(5);
        } else {
            this.portraitSprite.setAlpha(0);
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
        this.tweens.add({ targets: this.dialogBox, alpha: 0, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 0, duration: 200 });
        this.portraitSprite.setAlpha(0);
    }

    // ── Gemini API Helpers ──────────────────────────────────────────

    // Satu fungsi terpusat untuk semua panggilan ke Gemini API
    private async fetchGemini(prompt: string, maxTokens: number): Promise<string | null> {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { maxOutputTokens: maxTokens }
                    })
                }
            );
            const data = await response.json();

            if (data.error) {
                console.error("[Gemini] API error:", data.error.message);
                return null;
            }

            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                console.error("[Gemini] Response kosong:", JSON.stringify(data));
                return null;
            }

            return text;
        } catch (err) {
            console.error("[Gemini] Fetch error:", err);
            return null;
        }
    }

    // Validasi prompt — hanya dipanggil di prompt pertama
    private async validatePrompt(prompt: string): Promise<boolean> {
        if (!this.GEMINI_API_KEY) {
            const keywords = ['literasi', 'baca', 'buku', 'poster', 'membaca', 'tulis', 'ilmu', 'pengetahuan'];
            return keywords.some(k => prompt.toLowerCase().includes(k));
        }

        const checkPrompt = `Apakah kalimat berikut merupakan permintaan untuk membuat teks poster tentang literasi atau membaca?
Jawab HANYA dengan satu kata: YA atau TIDAK.
Kalimat: "${prompt}"`;

        const answer = await this.fetchGemini(checkPrompt, 5);
        if (!answer) return true; // Kalau validasi gagal, loloskan saja
        return answer.trim().toUpperCase().includes('YA');
    }

    // Generate konten dari Gemini
    private async callGeminiAPI(prompt: string): Promise<string> {
        if (!this.GEMINI_API_KEY) {
            return (this.questState === 1)
                ? "Buku adalah gudang ilmu, membaca adalah kuncinya. Literasi itu penting agar kita pintar."
                : "LITERASI: Jendela Masa Depan\n\nBuku adalah teman setia yang membuka pintu ke dunia penuh kemungkinan. Membaca bukan hanya sekadar mengeja kata-kata, tetapi sebuah petualangan yang mengubah cara kita berpikir dan memahami dunia.\n\nLiterasi adalah kekuatan nyata. Dengan membaca, kita belajar, tumbuh, dan berkembang. Ayo wujudkan impian dengan membaca lebih banyak setiap hari! Bersama-sama kita bisa mengubah masa depan melalui kekuatan literasi.";
        }

        const result = await this.fetchGemini(prompt, 1500);
        if (!result) {
            // Fallback jika API Limit/High Demand — Agar User tetap bisa lanjut quest
            return (this.questState === 1)
                ? "Membaca adalah jendela dunia. Literasi yang baik membantu kita memahami informasi dengan lebih bijak dan kritis di era digital ini."
                : "LITERASI: Jendela Masa Depan\n\nBuku adalah teman setia yang membuka pintu ke dunia penuh kemungkinan. Membaca bukan hanya sekadar mengeja kata-kata, tetapi sebuah petualangan yang mengubah cara kita berpikir dan memahami dunia.\n\nLiterasi adalah kekuatan nyata. Dengan membaca, kita belajar, tumbuh, dan berkembang. Ayo wujudkan impian dengan membaca lebih banyak setiap hari! Bersama-sama kita bisa mengubah masa depan melalui kekuatan literasi.";
        }
        return result;
    }

    // ── Gemini UI Overlay ───────────────────────────────────────────

    private showGeminiInterface() {
        if (document.getElementById('gemini-overlay')) return;

        const isFirstPrompt = this.questState === 1;

        const exampleSection = isFirstPrompt ? `
            <div style="background:#1a2a1a;border:1px solid #34a853;border-radius:12px;padding:16px;margin-bottom:16px;">
                <div style="color:#34a853;font-weight:bold;margin-bottom:8px;">💡 Contoh Prompt Sederhana:</div>
                <div style="color:#ccc;font-size:14px;line-height:1.8;">
                    • <span style="color:#fff;">"Buatkan teks poster tentang pentingnya membaca buku"</span><br>
                    • <span style="color:#fff;">"Tulis kalimat singkat untuk poster literasi anak SD"</span><br>
                    • <span style="color:#fff;">"Buat slogan poster yang mengajak orang suka membaca"</span>
                </div>
                <div style="color:#888;font-size:12px;margin-top:8px;">Coba ketik salah satu di atas, atau buat sendiri!</div>
            </div>
        ` : `
            <div style="background:#1a1a2e;border:1px solid #9B72CB;border-radius:12px;padding:16px;margin-bottom:16px;">
                <div style="color:#9B72CB;font-weight:bold;margin-bottom:8px;">🚀 Contoh Powerful Prompt:</div>
                <div style="color:#ccc;font-size:13px;line-height:2;">
                    <b style="color:#4285F4;">ROLE:</b> <span style="color:#fff;">Kamu adalah desainer poster kreatif untuk anak-anak</span><br>
                    <b style="color:#34a853;">GOAL:</b> <span style="color:#fff;">Buat teks poster yang memotivasi anak SD suka membaca</span><br>
                    <b style="color:#FBBC04;">CONTEXT:</b> <span style="color:#fff;">Poster akan dipasang di perpustakaan sekolah</span><br>
                    <b style="color:#DB4437;">VIBE:</b> <span style="color:#fff;">Semangat, ceria, dan penuh warna</span>
                </div>
                <div style="color:#888;font-size:12px;margin-top:8px;">Gabungkan semuanya jadi satu kalimat panjang!</div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.id = 'gemini-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); display: flex; justify-content: center;
            align-items: center; z-index: 10000; font-family: 'Inter', sans-serif;
        `;
        overlay.innerHTML = `
            <div style="width:820px;max-height:90vh;background:#131314;border-radius:24px;border:1px solid #333;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:20px;border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                    <span style="color:#fff;font-size:24px;font-weight:600;">
                        Gemini <span style="font-size:14px;opacity:0.5;">2.0 Flash</span>
                    </span>
                    <button id="close-gemini" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:24px;">&times;</button>
                </div>
                <div id="chat-area" style="flex:1;padding:20px;overflow-y:auto;color:#fff;min-height:0;">
                    <div style="color:#888;font-style:italic;margin-bottom:16px;">Ada yang bisa saya bantu, ${this.playerName}?</div>
                    ${exampleSection}
                </div>
                <div style="padding:16px 20px;background:#1e1f20;flex-shrink:0;">
                    <div style="display:flex;gap:10px;background:#2b2d2f;padding:10px 20px;border-radius:100px;">
                        <input id="gemini-input"
                            placeholder="${isFirstPrompt ? 'Ketik prompt tentang poster literasi...' : 'Ketik Powerful Prompt kamu di sini...'}"
                            style="flex:1;background:none;border:none;color:#fff;outline:none;font-size:14px;">
                        <button id="submit-prompt"
                            style="background:#4285F4;border:none;color:#fff;padding:5px 20px;border-radius:100px;cursor:pointer;white-space:nowrap;">
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

        const cleanupOverlay = () => {
            if (document.body.contains(overlay)) overlay.remove();
        };

        closeBtn.onclick = cleanupOverlay;
        input.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Mencegah Phaser 'memakan' input keyboard (seperti spasi)
            if (e.key === 'Enter') submitBtn.click();
        });
        setTimeout(() => input.focus(), 100);

        submitBtn.onclick = async () => {
            const prompt = input.value.trim();
            if (!prompt) return;

            input.disabled = true;
            submitBtn.disabled = true;
            submitBtn.textContent = '...';

            chatArea.innerHTML += `
                <div style="margin-top:16px;color:#4285F4;font-weight:bold;">Kamu:</div>
                <div style="margin-top:4px;">${prompt}</div>
            `;
            input.value = '';

            // Validasi di kedua prompt
            if (true) {
                chatArea.innerHTML += `<div id="ai-loading" style="color:#888;margin-top:12px;font-style:italic;">🔍 Mengecek prompt kamu...</div>`;
                chatArea.scrollTop = chatArea.scrollHeight;

                const isValid = await this.validatePrompt(prompt);
                overlay.querySelector('#ai-loading')?.remove();

                if (!isValid) {
                    chatArea.innerHTML += `
                        <div style="margin-top:12px;background:#2a1a1a;border:1px solid #DB4437;border-radius:10px;padding:14px;">
                            <div style="color:#DB4437;font-weight:bold;margin-bottom:6px;">❌ Prompt tidak sesuai!</div>
                            <div style="color:#ccc;font-size:14px;">
                                Tugasmu adalah membuat <b>teks poster tentang literasi</b>.<br>
                                Coba lagi dengan prompt yang berhubungan dengan membaca atau buku ya!
                            </div>
                        </div>
                    `;
                    chatArea.scrollTop = chatArea.scrollHeight;
                    input.disabled = false;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Kirim';
                    return;
                }
            }

            chatArea.innerHTML += `<div id="ai-loading" style="color:#9B72CB;margin-top:12px;font-style:italic;">✨ Gemini sedang menulis...</div>`;
            chatArea.scrollTop = chatArea.scrollHeight;

            const response = await this.callGeminiAPI(prompt);
            overlay.querySelector('#ai-loading')?.remove();

            chatArea.innerHTML += `
                <div style="margin-top:16px;color:#9B72CB;font-weight:bold;">Gemini:</div>
                <div style="margin-top:4px;white-space:pre-wrap;line-height:1.6;">${response}</div>
                <button id="report-btn" style="margin-top:16px;background:#222;border:1px solid #4285F4;color:#4285F4;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">
                    ✅ Laporkan ke Dr. Gemini
                </button>
            `;
            chatArea.scrollTop = chatArea.scrollHeight;

            input.disabled = false;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim';

            const reportBtn = overlay.querySelector('#report-btn') as HTMLButtonElement;
            reportBtn.onclick = () => {
                cleanupOverlay();
                if (this.questState === 1) {
                    this.questState = 2;
                    this.startSequence([{ text: `Hasil pertama sudah aku catat. Ayo lapor ke Dr. Gemini!`, speaker: 'gogole' }]);
                } else if (this.questState === 3) {
                    this.questState = 4;
                    this.startSequence([{ text: `Hasil kedua jauh lebih bagus! Dr. Gemini pasti suka.`, speaker: 'gogole' }]);
                }
            };
        };
    }

    // ── Dialog UI ──────────────────────────────────────────────────

    private createDialogUI() {
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(1001).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(1002);
        this.portraitSprite = this.add.sprite(-600, 80, 'dr_gemini_portrait').setScale(6).setAlpha(0);
        this.dialogBox.add(this.portraitSprite);

        const bg = this.add.rectangle(0, 0, 1500, 220, 0x000000, 0.9).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', {
            fontSize: '32px', color: '#ffffff',
            wordWrap: { width: 1300 }, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.dialogBox.add([bg, this.dialogText]);
    }

    // ── Update Loop ────────────────────────────────────────────────

    update() {
        if (!this.playerContainer || !this.cursors) return;

        if (this.questState === 5 && this.playerContainer.x > 1850) {
            this.cleanupDOMOverlays();
            this.scene.start('Map3Scene', { playerName: this.playerName });
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

        this.playerContainer.setDepth(9999);
        this.drGeminiNPC.setDepth(this.drGeminiNPC.y);
        this.smallRobots.forEach(robot => robot.setDepth(robot.y));

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

        this.activeRobot = null;
        for (const robot of this.smallRobots) {
            const distRobot = Phaser.Math.Distance.Between(
                this.playerContainer.x, this.playerContainer.y,
                robot.x, robot.y
            );
            if (distRobot < 150) { this.activeRobot = robot; break; }
        }

        const cam = this.cameras.main;
        if (this.isNearDrGemini) {
            this.interactPrompt
                .setText('[ENTER] Bicara')
                .setPosition(this.drGeminiNPC.x - cam.scrollX, this.drGeminiNPC.y - 120 - cam.scrollY)
                .setAlpha(1);
        } else if (this.isNearGreenTV && (this.questState === 1 || this.questState === 3)) {
            this.interactPrompt
                .setText('[ENTER] Gunakan Gemini')
                .setPosition(750 - cam.scrollX, 520 - 120 - cam.scrollY)
                .setAlpha(1);
        } else if (this.activeRobot) {
            this.interactPrompt
                .setText('[ENTER] Sapa')
                .setPosition(this.activeRobot.x - cam.scrollX, this.activeRobot.y - 100 - cam.scrollY)
                .setAlpha(1);
        } else {
            this.interactPrompt.setAlpha(0);
        }
    }

    private cleanupDOMOverlays() {
        document.getElementById('gemini-overlay')?.remove();
    }

    shutdown() {
        this.cleanupDOMOverlays();
    }
}
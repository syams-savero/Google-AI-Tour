import * as Phaser from 'phaser';

export class Map3Scene extends Phaser.Scene {
    private playerContainer!: Phaser.GameObjects.Container;
    private playerSprite!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // UI & NPCs
    private dialogBox!: Phaser.GameObjects.Container;
    private dialogText!: Phaser.GameObjects.Text;
    private portraitSprite!: Phaser.GameObjects.Sprite;
    private gradientGraphics!: Phaser.GameObjects.Graphics;
    private interactPrompt!: Phaser.GameObjects.Text;

    private robotNano!: Phaser.GameObjects.Sprite;
    private robotTTS!: Phaser.GameObjects.Sprite;
    private robotStudio!: Phaser.GameObjects.Sprite;
    private cleaningRobot!: Phaser.GameObjects.Sprite;

    // Trashes
    private trash1!: Phaser.GameObjects.Sprite;
    private trash2!: Phaser.GameObjects.Sprite;
    private trash3!: Phaser.GameObjects.Sprite;

    private barriers!: Phaser.Physics.Arcade.StaticGroup;

    // Quest & Dialog States
    private questStep: number = 0; // 0: Start, 1: Talking, 2: Chose Theme, 3: Prompting, 4: Result, 5: Finished Nano
    private selectedTheme: 'Evolusi' | 'Inovasi' | null = null;
    private isDialogActive: boolean = false;
    private isTyping: boolean = false;
    private fullText: string = "";
    private typeTimer?: Phaser.Time.TimerEvent;
    private dialogSequence: { text: string, speaker: 'gogole' | 'nano' | 'tts' | 'studio' | 'none', action?: string }[] = [];
    private currentDialogIndex: number = 0;
    private onSequenceComplete?: () => void;

    // UI Elements
    private choiceButtons!: Phaser.GameObjects.Container;
    private selectedChoice: 'Evolusi' | 'Inovasi' = 'Evolusi';

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

        // --- BARRIERS SETUP ---
        this.barriers = this.physics.add.staticGroup();

        // Pembatas Atas (Tembok/Meja Stand) - Menghalangi area y < 450
        this.barriers.add(this.add.rectangle(960, 440, 1920, 80, 0x0000ff, 0));

        // Pembatas Bawah - Menghalangi area y > 1000
        this.barriers.add(this.add.rectangle(960, 1050, 2000, 100, 0xff0000, 0));

        // Collider antara player dan barrier
        this.physics.add.collider(this.playerContainer, this.barriers);

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

        // --- UI ELEMENTS ---
        this.createDialogUI();
        this.createChoiceButtons();

        this.interactPrompt = this.add.text(0, 0, '[ENTER]', {
            fontSize: '24px', color: '#ffffff', backgroundColor: '#4285F4', padding: { x: 12, y: 6 }, fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0).setDepth(20000).setScrollFactor(0);

        // Controls
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.on('keydown-ENTER', () => {
                // Jangan lanjut dialog kalau lagi ada overlay Gemini
                if (document.getElementById('gemini-overlay') || document.getElementById('res-overlay')) return;

                if (this.isTyping) this.completeTypewriter();
                else if (this.choiceButtons.alpha > 0) this.handleChoice(this.selectedChoice);
                else if (this.isDialogActive) this.advanceDialog();
                else this.handleProximityInteraction();
            });

            this.input.keyboard.on('keydown-LEFT', () => {
                if (this.choiceButtons.alpha > 0) this.updateChoiceSelection('Evolusi');
            });
            this.input.keyboard.on('keydown-RIGHT', () => {
                if (this.choiceButtons.alpha > 0) this.updateChoiceSelection('Inovasi');
            });
        }

        console.log("Map 3 Visuals & UI Ready!");
    }



    private createDialogUI() {
        this.gradientGraphics = this.add.graphics().setScrollFactor(0).setDepth(1001).setAlpha(0);
        this.gradientGraphics.fillGradientStyle(0, 0, 0, 0, 0, 0, 0.85, 0.85);
        this.gradientGraphics.fillRect(0, 720, 1920, 360);

        this.dialogBox = this.add.container(960, 920).setScrollFactor(0).setAlpha(0).setDepth(20000);

        // Portrait ala Map 2
        this.portraitSprite = this.add.sprite(-600, -320, 'nano_asset').setScale(6).setAlpha(0);

        const bg = this.add.rectangle(0, 0, 1500, 220, 0, 0.9).setStrokeStyle(4, 0x4285F4);
        this.dialogText = this.add.text(0, 0, '', { fontSize: '32px', color: '#fff', wordWrap: { width: 1300 }, fontStyle: 'bold' }).setOrigin(0.5);

        this.dialogBox.add([this.portraitSprite, bg, this.dialogText]);
    }

    private createChoiceButtons() {
        this.choiceButtons = this.add.container(960, 600).setScrollFactor(0).setAlpha(0).setDepth(10000);
        const btnEvo = this.add.container(-250, 0);
        const btnIno = this.add.container(250, 0);

        const bgEvo = this.add.rectangle(0, 0, 400, 100, 0x333333, 0.9).setStrokeStyle(4, 0x4285F4).setName('bg');
        const txtEvo = this.add.text(0, 0, 'EVOLUSI', { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        btnEvo.add([bgEvo, txtEvo]);

        const bgIno = this.add.rectangle(0, 0, 400, 100, 0x333333, 0.9).setStrokeStyle(4, 0xffffff).setName('bg');
        const txtIno = this.add.text(0, 0, 'INOVASI', { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        btnIno.add([bgIno, txtIno]);

        this.choiceButtons.add([btnEvo, btnIno]);
    }

    private updateChoiceSelection(choice: 'Evolusi' | 'Inovasi') {
        this.selectedChoice = choice;
        const btnEvo = this.choiceButtons.list[0] as Phaser.GameObjects.Container;
        const btnIno = this.choiceButtons.list[1] as Phaser.GameObjects.Container;

        (btnEvo.getByName('bg') as Phaser.GameObjects.Rectangle).setStrokeStyle(4, choice === 'Evolusi' ? 0x4285F4 : 0xffffff);
        (btnIno.getByName('bg') as Phaser.GameObjects.Rectangle).setStrokeStyle(4, choice === 'Inovasi' ? 0x4285F4 : 0xffffff);
    }

    private startNanoQuest() {
        this.startSequence([
            { text: `Haloo ${this.playerName}, selamat datang di Stand Nano Banana!`, speaker: 'nano' },
            { text: `Yuk, wujudkan kreatifitas dan imajinasi mu bareng aku!`, speaker: 'nano' },
            { text: `ini apa?`, speaker: 'gogole' },
            { text: `Oh kamu belum tau ya? Jadi Nano Banana ini adalah sebuah tools untuk generate gambar dan ilustrasi loh.`, speaker: 'nano' },
            { text: `Biasanya digunakan untuk bikin poster, cover, meme, ilustrasi untuk pembelajaran, dan lain-lain.`, speaker: 'nano' },
            { text: `Mau coba bikin ilustrasi bareng?`, speaker: 'nano' },
            { text: `Wah boleh tuh, mau bikin ilustrasi apa kita?`, speaker: 'gogole' },
            { text: `Biar cepet kukasih 2 pilihan deh, mau tentang Inovasi atau Evolusi?`, speaker: 'nano' }
        ], () => {
            this.choiceButtons.setAlpha(1);
        });
    }

    private handleChoice(choice: 'Evolusi' | 'Inovasi') {
        this.selectedTheme = choice;
        this.choiceButtons.setAlpha(0);
        this.startSequence([
            { text: `Okee jadi kamu pilih ${choice} ya, gas yuk kita buat!`, speaker: 'nano' }
        ], () => {
            this.showGeminiInterface();
        });
    }

    private async showGeminiInterface() {
        if (document.getElementById('gemini-overlay')) return;

        const draftInovatif = `[Role]
Anda adalah seorang ilustrator komik digital profesional dan desainer grafis yang ahli dalam membuat ilustrasi edukatif, infografis, dan perbandingan visual dengan gaya seni komik modern yang bersih dan detail.

[Goals]
Buatlah sebuah ilustrasi dua panel berdampingan (side-by-side) yang membandingkan kehidupan anak-anak/remaja di Indonesia antara zaman dulu dan zaman sekarang.

Panel Kiri (Dulu):
Tunjukkan suasana era 1990-an di area berkembang Indonesia.
Fokus utama: Seorang anak sekolah dasar mengenakan seragam putih-merah/putih-biru sedang mengantre atau menggunakan telepon umum koin/kartu di dalam stan ikonik berwarna merah-abu-abu.
Sub-panel bawah: Suasana malam hari di mana anak-anak sedang belajar di dalam rumah hanya menggunakan pencahayaan lilin dan lampu teplok (minyak tanah) karena keterbatasan listrik.
Beri label teks di bagian atas panel: "DULU: MENUNGGU DAN TERBATAS".

Panel Kiri (Sekarang):
Tunjukkan suasana kota modern yang serba digital dan ramah lingkungan.
Fokus utama: Remaja modern yang duduk santai di taman kota, menggunakan smartphone, di bawah fasilitas lampu jalan LED bertenaga surya (solar panel) dan stasiun pengisian daya USB publik (public USB charging station).
Sub-panel bawah: Suasana stasiun kereta bawah tanah/MRT yang canggih, di mana orang-orang sibuk menggunakan gadget, tablet, laptop, dan layar informasi digital interaktif.
Beri label teks di bagian atas panel: "SEKARANG: TERHUBUNG DAN INOVATIF".

Judul Utama: Letakkan teks besar di bagian paling atas tengah: "DULU VS SEKARANG".

[Context]
Tujuan Gambar: Ilustrasi ini akan digunakan untuk kampanye edukasi sosial mengenai perkembangan teknologi, inovasi energi terbarukan, dan transformasi digital di Indonesia dari masa ke masa.
Detail Karakter: Karakter harus merepresentasikan wajah lokal Indonesia, dengan ekspresi yang ceria (pada panel modern) dan ekspresi polos/fokus (pada panel jadul).
Elemen Tambahan: Tambahkan beberapa label teks bahasa Inggris penunjuk objek seperti "1990s developing city in Indonesia", "LED-powered solar panel street lights", and "Public USB charging stations" untuk memperjelas inovasi yang dipamerkan.

[Vibe]
Gaya Seni: Komik digital (clean line art) dengan sentuhan warna-warni yang estetik, mirip ilustrasi webtoon atau infografis modern yang ramah anak (family-friendly).
Palet Warna:
Panel "Dulu" menggunakan tone warna hangat (warm tone), sedikit berdebu, kecokelatan, dan vintage untuk memberikan kesan nostalgia.
Panel "Sekarang" menggunakan warna yang lebih cerah, bersih, didominasi warna biru, hijau taman, dan elemen neon digital untuk memberikan kesan futuristik, bersih, dan inovatif.
Suasana: Informatif, kontras yang jelas, nostalgia di satu sisi, dan penuh harapan/kemajuan di sisi lainnya.`;

        const draftEvolusi = `[Role]
Anda adalah seorang ilustrator infografis sains dan desainer kurikulum visual profesional yang ahli dalam menyederhanakan konsep sejarah, antropologi, dan teknologi ke dalam bentuk bagan komik edukatif yang menarik, terstruktur, serta mudah dipahami oleh segala usia.

[Goals]
Buatlah sebuah infografis atau bagan komparatif multi-panel berdampingan (side-by-side) yang menggambarkan evolusi biologis dan perkembangan teknologi/budaya manusia dari zaman purba hingga era modern abad ke-21.

Judul Utama: Tulis teks tebal besar di bagian atas tengah: "EVOLUSI: PERJALANAN MANUSIA".

Sisi Kiri (Masa Lalu - Biologis & Prasejarah):
Bagian Atas (Asal Usul Biologis): Tampilkan diagram garis evolusi linier dari kiri ke kanan yang menunjukkan 4 tahap spesies: Proconsul (berjalan dengan empat kaki), Australopithecus (mulai tegak memegang kayu, label: "Adaptasi Fisik"), Homo erectus (memegang obor api, label: "Fire"), dan Homo sapiens (manusia modern awal dengan panah menunjuk ke diagram otak, label: "Pengembangan Otak"). Beri judul bagian: "ASAL USUL BIOLOGIS".
Bagian Bawah (Kehidupan Awal): Tunjukkan dua diorama kehidupan purba di dalam gua dan hutan. Sisi kiri menunjukkan manusia purba membuat perkakas batu (label: "Alat Batu Pertama"). Sisi kanan menunjukkan manusia purba menggambar hewan di dinding gua dekat api unggun (label: "Seni Gua"). Beri judul bagian: "KEHIDUPAN AWAL (BERBURU & MERAMU)".

Sisi Kanan (Masa Kini & Masa Depan - Inovasi & Konektivitas):
Bagian Atas (Era Modern): Tampilkan sepasang remaja Asia/Indonesia modern berpakaian santai sedang duduk di bangku taman kota sambil melihat smartphone. Di sekitar mereka terdapat fasilitas ramah lingkungan seperti lampu jalan bertenaga surya (label: "LED-powered solar panel street lights") dan tiang charger umum (label: "Public USB charging stations"). Beri judul bagian: "ERA MODERN: INOVASI TANPA BATAS".
Bagian Bawah (Masa Depan & Integrasi): Tampilkan suasana stasiun kereta cepat bawah tanah (MRT) yang futuristik dan sibuk. Tunjukkan orang-orang menggunakan gadget, tablet, dan laptop (label: "Konektivitas Global"). Selipkan elemen transisi sejarah di latar belakang seperti teks "Revolusi Pertanian" dan "Peradaban Kuno". Beri teks penutup di dasar panel: "MASA DEPAN: ADAPTASI TERUS-MENERUS".

[Context]
Tujuan Gambar: Gambar ini ditujukan sebagai materi visual edukasi sejarah, ensiklopedia digital, atau poster dinding sekolah untuk menjelaskan hubungan antara evolusi fisik manusia dengan evolusi teknologi yang mereka ciptakan.
Akurasi Teks: Pastikan semua label teks bahasa Indonesia dan bahasa Inggris (seperti nama spesies dan label teknologi) tertulis secara jelas, rapi, dan mudah dibaca layaknya komik infografis resmi.
Konektivitas Narasi: Gunakan elemen garis penunjuk atau panah transisi tipis yang menghubungkan figur Homo sapiens di panel biologi menuju panel peradaban modern untuk menunjukkan alur waktu yang berkesinambungan.

[Vibe]
Gaya Seni: Komik digital dengan clean line art yang tegas, semi-realistis namun tetap ramah (family-friendly) layaknya ilustrasi buku pengetahuan populer atau webtoon edukasi.
Palet Warna:
Sisi kiri didominasi warna-warna bumi (earthy tones) seperti cokelat tanah, hijau hutan, krem kertas kuno, dan abu-abu batu gua untuk memperkuat kesan prasejarah.
Sisi kanan didominasi warna-warna cerah, bersih, dan teknologi (tech-vibe) seperti biru muda langit, hijau taman kota yang segar, serta pendaran cahaya digital putih/neon.
Suasana: Edukatif, inspiratif, penuh informasi, teratur, dan menunjukkan kontras yang kontemporer antara kesederhanaan masa lalu dengan kecanggihan masa kini.`;

        const selectedDraft = this.selectedTheme === 'Evolusi' ? draftEvolusi : draftInovatif;

        const overlay = document.createElement('div');
        overlay.id = 'gemini-overlay';
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:99999;font-family:sans-serif;`;

        overlay.innerHTML = `
            <div style="width:820px;background:#131314;border-radius:24px;border:1px solid #333;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:20px;border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between;">
                    <span style="color:#fff;font-size:24px;font-weight:600;">Gemini <span style="font-size:14px;opacity:0.5;">2.0 Flash</span></span>
                </div>
                <div id="chat-area" style="height:400px;padding:20px;overflow-y:auto;color:#fff;">
                    <div style="color:#888;font-style:italic;margin-bottom:16px;">Nano Banana Generator - Tema: ${this.selectedTheme}</div>
                    
                    <div style="background:#1a1a2e;border:1px solid #4285F4;border-radius:12px;padding:20px;margin-bottom:16px;">
                        <div style="color:#4285F4;font-weight:bold;margin-bottom:10px;">🚀 DRAFT POWERFUL PROMPT:</div>
                        <div style="color:#ccc;font-size:13px;line-height:1.6;background:#000;padding:15px;border-radius:8px;border:1px dashed #444;max-height:150px;overflow-y:auto;white-space:pre-wrap;">${selectedDraft}</div>
                        <div style="color:#888;font-size:12px;margin-top:10px;">Prompt sakti di atas sudah otomatis terisi di kolom input bawah. Langsung klik "Kirim" yuk!</div>
                    </div>
                </div>
                <div style="padding:20px;background:#1e1f20;display:flex;gap:10px;">
                    <input id="gemini-input" value='${selectedDraft.replace(/'/g, "&apos;")}' style="flex:1;background:#2b2d2f;border:none;color:#fff;padding:12px 20px;border-radius:100px;outline:none;">
                    <button id="submit-btn" style="background:#4285F4;color:#fff;border:none;padding:10px 30px;border-radius:100px;cursor:pointer;font-weight:bold;">Kirim</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('gemini-input') as HTMLInputElement;
        const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
        const chatArea = document.getElementById('chat-area') as HTMLDivElement;

        input.focus();
        input.onkeydown = (e) => { if (e.key === 'Enter') submitBtn.click(); };

        submitBtn.onclick = async () => {
            const prompt = input.value.trim();
            if (!prompt) return;

            input.disabled = true;
            submitBtn.disabled = true;
            chatArea.innerHTML += `<div style="margin-top:16px;color:#4285F4;font-weight:bold;">Kamu:</div><div style="margin-top:4px;">${prompt}</div>`;
            chatArea.scrollTop = chatArea.scrollHeight;

            const isValid = await this.validatePrompt(prompt);
            if (!isValid) {
                chatArea.innerHTML += `<div style="margin-top:12px;color:#DB4437;background:#2a1a1a;padding:12px;border-radius:8px;">
                    <b>Gagal:</b> Prompt harus menggunakan format Powerful Prompt dan sesuai tema ${this.selectedTheme}.
                </div>`;
                chatArea.scrollTop = chatArea.scrollHeight;
                input.disabled = false;
                submitBtn.disabled = false;
                return;
            }

            chatArea.innerHTML += `<div style="margin-top:16px;color:#9B72CB;font-weight:bold;">Gemini:</div><div style="margin-top:4px;color:#ccc;">Siap! Prompt kamu sangat bagus. Memproses gambar...</div>`;
            chatArea.scrollTop = chatArea.scrollHeight;

            setTimeout(() => {
                overlay.remove();
                this.showResultSimulation();
            }, 1500);
        };
    }

    private async validatePrompt(prompt: string): Promise<boolean> {
        const p = prompt.toLowerCase();
        // Validasi simpel: Cek keyword Powerful Prompt dan Tema
        const hasRole = p.includes('peran') || p.includes('role') || p.includes('sebagai');
        const hasGoal = p.includes('tujuan') || p.includes('goal') || p.includes('buatkan');
        const hasContext = p.includes('konteks') || p.includes('context') || p.includes('untuk');
        const hasVibe = p.includes('vibe') || p.includes('nuansa') || p.includes('gaya');
        const hasTheme = p.includes(this.selectedTheme?.toLowerCase() || "");

        return (hasRole || hasGoal || hasContext || hasVibe) && hasTheme;
    }

    private showResultSimulation() {
        const overlay = document.createElement('div');
        overlay.id = 'res-overlay';
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);display:flex;justify-content:center;align-items:center;z-index:99999;flex-direction:column;`;

        const themeFile = this.selectedTheme === 'Evolusi' ? 'IlustrasiEvolusi.png' : 'IlustrasiInovasi.png';

        overlay.innerHTML = `
            <div style="text-align:center;color:white;font-family:sans-serif;">
                <div style="border:4px solid #4285F4;border-radius:20px;overflow:hidden;margin-bottom:20px;width:700px;background:#000;">
                    <img src="/assets/${themeFile}" style="width:100%;display:block;">
                </div>
                <button id="res-btn" style="padding:15px 40px;background:#fff;color:#000;border:none;border-radius:100px;font-weight:bold;cursor:pointer;">Keren Banget!</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('res-btn')!.onclick = () => {
            overlay.remove();
            this.startSequence([
                { text: `Keren kan.. dengan begini kamu bisa lebih mudah untuk belajar.`, speaker: 'nano' },
                { text: `Oh ya, biar lengkap yuk kita bikin penjelasan nya menggunakan suara.`, speaker: 'nano' },
                { text: `Kamu tinggal jalan aja ke kanan menuju stand nya TTS, nanti di sana akan dibantu.`, speaker: 'nano' },
                { text: `Okee, makasih ya ilustrasi nya!`, speaker: 'gogole' },
                { text: `Sama-sama, semangat ya belajarnya!`, speaker: 'nano' }
            ], () => {
                this.questStep = 1; // Mark Nano finished
            });
        };
    }

    // --- SEQUENCE ENGINE ---
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
        this.isTyping = true;
        this.tweens.add({ targets: this.dialogBox, alpha: 1, duration: 200 });
        this.tweens.add({ targets: this.gradientGraphics, alpha: 1, duration: 200 });

        // Update Portrait ala Map 2
        if (speaker === 'nano') {
            this.portraitSprite.setTexture('nano_asset').setAlpha(1).setScale(0.8).setX(600).setFlipX(false).setDepth(20010);
        } else if (speaker === 'gogole') {
            this.portraitSprite.setTexture('player_robot').setAlpha(1).setScale(4.5).setX(-600).setFlipX(true).setDepth(20010);
        } else if (speaker === 'tts') {
            this.portraitSprite.setTexture('tts_asset').setAlpha(1).setScale(0.8).setX(600).setFlipX(false).setDepth(20010);
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
                if (charIndex >= this.fullText.length) { this.isTyping = false; this.typeTimer = undefined; }
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
    }

    private handleProximityInteraction() {
        const distNano = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, this.robotNano.x, this.robotNano.y);
        if (distNano < 150 && this.questStep === 0) {
            this.startNanoQuest();
        }
    }

    update() {
        if (!this.playerContainer || !this.cursors) return;

        // No Reverse Rule
        if (this.playerContainer.x < 100) this.playerContainer.x = 100;

        const body = this.playerContainer.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);
        if (this.isDialogActive || this.choiceButtons.alpha > 0) return;

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

        // Interaction Prompt Proximity
        const distNano = Phaser.Math.Distance.Between(this.playerContainer.x, this.playerContainer.y, this.robotNano.x, this.robotNano.y);
        const cam = this.cameras.main;

        if (distNano < 150 && this.questStep === 0) {
            this.interactPrompt.setText('[ENTER] Nano Banana')
                .setPosition(this.robotNano.x - cam.scrollX, this.robotNano.y - 150 - cam.scrollY)
                .setAlpha(1);
        } else {
            this.interactPrompt.setAlpha(0);
        }
    }
}

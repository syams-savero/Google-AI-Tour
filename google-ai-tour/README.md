# 🎮 Google AI Tour — #JuaraVibeCoding

> Petualangan interaktif belajar AI untuk anak SD hingga SMP.
> Dari "Seru kayanya kalau buat..." jadi "Live URL" yang nyata. ✌️

---

## 📖 Tentang Game Ini

Halo! Kenalin, ini **Google AI Tour** — game yang dibuat untuk #JuaraVibeCoding.

Ceritanya gini, saya liat banyak anak SD-SMP udah pada tau AI, tapi pas ditanya "AI bisa apalagi?" jawabannya cuma **"ya buat nanya-nanya aja"**. Padahal potensi AI itu jauh banget! Bisa bikin gambar, suara, coding, bahkan game kayak gini sendiri.

Masalah lainnya: mereka pikir **"ah pasti susah belajar AI"**. Padahal engga — sekarang udah ada **Google AI Studio** yang gampang banget dipake.

Nah, game ini hadir sebagai **jembatan awal** biar anak-anak Indonesia sadar: **mereka bisa bikin apa pun yang mereka bayangkan pakai AI**. Cukup modal imajinasi dan prompt yang bener.

---

## 🎯 Target Pemain

- **Usia 7-15 tahun** (SD - SMP)
- **Pemula total** — nggak perlu bisa coding
- **Siapa pun** yang penasaran sama AI tapi bingung mulai dari mana

---

## 🕹️ Alur Bermain & Ilmu yang Didapat

### 🏛️ Map 1 — Lobby & Profesor
| Gameplay | Ilmu yang Didapat |
|----------|-------------------|
| Kenalan sama **Gogole** si robot pemandu Kamu bakal input nama sendiri dan ngobrol sama Profesor buat tau dasar-dasar AI. | **Apa itu AI dan potensinya** — AI bukan cuma chatbot! |

### 🧪 Map 2 — Lab Dr. Gemini
| Gameplay | Ilmu yang Didapat |
|----------|-------------------|
| Ketemu **Dr. Gemini** yang bakal ngajarin cara nge-prompt yang bener. Kamu disuruh bikin teks poster literasi pake **Powerful Prompt** — pakai format **ROLE, GOAL, CONTEXT, VIBE**. Kalau promptnya asal, ditolak! Kalau bener, hasilnya keren! | **Prompt Engineering dasar** — Nge-prompt itu ada tekniknya! |

### 🎨 Map 3 — Lab Kreatif (3 Stand)
| Stand | Gameplay | Ilmu yang Didapat |
|-------|----------|-------------------|
| 🍌 **Nano Banana** | Bikin ilustrasi digital cuma pakai prompt — pilih tema **Evolusi** atau **Inovasi**, Gemini yang bikin gambarnya! | **AI Image Generation** — Bikin gambar dari teks |
| 🔊 **TTS** | Ilustrasi yang udah dibuat diubah jadi **narasi suara** otomatis | **Text-to-Speech** — Bikin suara dari teks |
| 🤖 **AI Studio** | Kamu ngetik prompt buat **ngontrol robot pembersih** yang bergerak beneran nyapu sampah di layar! Real-time animasi! | **AI untuk kontrol & otomatisasi** |

### ✨ Map 4 — Finale
| Gameplay | Ilmu yang Didapat |
|----------|-------------------|
| Penutup inspiratif — "perjalananmu baru dimulai" — dan kamu langsung diarahkan ke **Google AI Studio** buat mulai bikin karyamu sendiri. | **Kamu bisa bikin apa pun dengan AI Studio** — termasuk game ini sendiri! |

---

## 💡 Contoh Penggunaan (Use Case)

**Di Sekolah:**
Guru bisa pake game ini sebagai alat bantu ajar pengenalan AI. Cukup 15-20 menit, siswa langsung paham prompt engineering dan praktik bikin gambar + suara.

**Belajar Mandiri:**
Anak bisa explore sendiri di rumah. Nggak perlu pendampingan orang tua.

**Contoh nyata:**
Seorang anak SD bilang *"Coba dong buatin ilustrasi kerangka mobil"* — nah nanti AI bakal bikin gambar dan narasi penjelasan supaya lebih gampang dipahami. Bayangin, kalau sejak dini aja mereka udah bisa bikin produk kreatif, apalagi nanti kalau udah gede!

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) — Standalone output
- **Game Engine:** [Phaser 4](https://phaser.io/)
- **AI:** Google Gemini (`@google/generative-ai`) — Model 2.5 Flash Lite & 3.5 Flash
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Bahasa:** TypeScript

---

## 🚀 Cara Install & Jalanin di Local

### Persyaratan
- Node.js 18+
- NPM
- API Key Google Gemini (GRATIS)

### Langkah-langkah

```bash
# 1. Clone repositori ini
git clone <url-repo>
cd google-ai-tour

# 2. Install semua dependencies
npm install

# 3. Buat file .env.local di root folder
# Isi dengan API Key Gemini kamu:
NEXT_PUBLIC_GEMINI_API_KEY=isi_api_key_kamu_disini

# 4. Jalanin di local
npm run dev
```

Buka **http://localhost:3000** di browser. Game siap dimainkan! 🎉

### Cara Dapetin API Key Gemini

1. Buka **[Google AI Studio](https://aistudio.google.com/)**
2. Login pake akun Google kamu
3. Klik tombol **"Get API Key"** di sidebar
4. Klik **"Create API Key"**
5. Pilih project Google Cloud kamu (atau buat baru)
6. **Copy** API Key-nya
7. Paste ke file `.env.local` seperti di atas

> ⚠️ **PENTING:** .env.local udah ada di `.gitignore`, jadi API Key kamu aman — nggak bakal ke-commit ke GitHub.

---

## 🎮 Cara Main

| Tombol | Fungsi |
|--------|--------|
| `W` `A` `S` `D` | Jalan / Gerakin karakter |
| `Enter` | Interaksi / Ngobrol sama NPC |
| Klik robot 🟦 di kiri layar | Chat sama **Gogole** (AI asisten) |
| `←` `→` atau `A` `D` | Pilih opsi (YA/TIDAK, Evolusi/Inovasi) |

---

## 📁 Struktur Folder

```
google-ai-tour/
├── app/
│   ├── api/chat/route.ts    # Gemini API endpoint (chatbot Gogole)
│   ├── globals.css           # Styling global + animasi
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Halaman utama (landing → guide → game)
├── components/
│   ├── AudioManager.ts       # Manager BGM & SFX
│   ├── GameBridge.tsx        # Bootstrap Phaser
│   ├── PhaserConfig.ts       # Konfigurasi Phaser
│   ├── MainScene.ts          # Map 1 — Lobby & Profesor
│   ├── GeminiScene.ts        # Map 2 — Lab Dr. Gemini
│   ├── Map3Scene.ts          # Map 3 — Lab Kreatif
│   └── Map4Scene.ts          # Map 4 — Finale
├── public/assets/            # Gambar, audio, sprites (26 file)
├── .env.local                # API Key Gemini (buat sendiri!)
├── next.config.ts            # Next.js config
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── Dockerfile                # Buat deploy (optional)
```

---

## 🏆 Penutup

Google AI Tour adalah bukti bahwa **ide sederhana bisa jadi kenyataan** — cukup pakai Google AI Studio, Gemini, dan dikit-dikit vibe coding. Anak SD-SMP pun bisa mulai bikin karya mereka sendiri.

**Kalau bisa kamu bayangkan, bisa kamu vibe-code.** Yuk, mulai! ✌️🌐

---

*Dibuat oleh **Vero** untuk #JuaraVibeCoding — Google for Developers Indonesia 2026.*
*Powered by Google AI Studio & Gemini.*

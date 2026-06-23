# 🎬 Anilocal Player

> **Local-first anime player** dengan skip intro/outro otomatis, multi-track subtitle (ASS/SSA/SRT/VTT), Rich Presence Discord, dan library management — dibangun dengan Electron + React + TypeScript.

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](#)
[![Tech](https://img.shields.io/badge/Electron-39-47848F?logo=electron)](#)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

---

## ✨ Fitur Utama

### 📚 Library & File Management
- **Library Sidebar** — kelola banyak anime/series dalam satu tempat.
- **Folder Scanning otomatis** — pilih folder, Anilocal akan otomatis mendeteksi semua video (`mp4`, `mkv`, `webm`, `avi`) di dalamnya termasuk sub-folder.
- **Fansub Parser** — mengenali pola nama file fansub seperti `[SubsPlease] Frieren - 12 (1080p) [ABCD1234].mkv` dan mengekstrak group, judul, dan nomor episode.
- **Library Persistence** — library disimpan secara lokal menggunakan `lowdb`, tetap ada setelah restart aplikasi.
- **Import Skip Pack (.json)** — import skip-timestamps massal dari file JSON (kompatibel dengan format AniSkip & sejenisnya).
- **Episode Mapping** — atur nomor episode manual untuk setiap file jika auto-detection gagal.
- **Natural Sort** — episode diurutkan dengan natural compare (Episode 2 sebelum Episode 10).

### 🎥 Video Player
- **Format video lengkap** — `MP4`, `MKV`, `WebM`, `AVI` via HTML5 `<video>` element.
- **Custom Video Controls** — UI kontrol yang clean, dengan auto-hide saat idle/fullscreen.
- **Klik untuk play/pause** — klik pada area video untuk toggle play/pause.
- **Progress bar interaktif** — klik di mana saja pada progress bar untuk seek.
- **Volume control** — slider + mute toggle.
- **Fullscreen mode** — `F` untuk toggle, dengan cursor auto-hide saat idle.
- **Repeat Episode** — putar episode yang sama berulang-ulang (otomatis menonaktifkan autoplay).
- **Autoplay Next Episode** — countdown 5 detik sebelum lanjut episode berikutnya (bisa dibatalkan).
- **File association** — buka file `.mp4/.mkv/.webm/.avi` langsung dari file explorer (Windows/macOS/Linux).
- **"Open With" context menu** — klik kanan link video di browser → buka dengan Anilocal.

### ⏭️ Skip Intro/Outro (Fitur Unggulan)
- **Manual Skip Editor** — buka modal edit dan masukkan timestamp `introStart`, `introEnd`, `outroStart`, `outroEnd` per episode.
- **Skip Overlay** — tombol "Skip Intro"/"Skip Outro" muncul otomatis saat berada di zona timestamp.
- **Skip Pack Import** — import JSON berisi skip-timestamp banyak episode sekaligus, langsung terapkan ke semua episode anime.
- **Per-episode skip data** — data skip disimpan permanen per `filePath`, sehingga tidak hilang meski rename folder.
- **Tombol `S`** — keyboard shortcut untuk skip intro/outro secara manual.

### 💬 Multi-Format Subtitle
- **Mendukung `ASS`, `SSA`, `SRT`, `VTT`** — semua format subtitle umum.
- **ASS/SSA Canvas Renderer** — render subtitle ASS/SSA lengkap dengan styling (font, warna, outline, shadow), positioning, multi-line, dan karaoke timing menggunakan `ass-compiler` + HTML5 Canvas.
- **SRT → VTT auto-conversion** — file `.srt` otomatis dikonversi ke `.vtt` untuk kompatibilitas browser.
- **Auto Language Detection** — mendeteksi bahasa subtitle dari nama file (Indonesia, English, Japanese, Chinese, Arabic, Spanish, French, Portuguese).
- **Format Priority** — `ASS > SSA > SRT > VTT` (prioritas untuk kualitas typography fansub).
- **Subtitle Preferences** — set bahasa & format favorit di Settings, otomatis dipilih saat episode baru.
- **Last-used Memory** — pilihan subtitle terakhir diingat antar episode (persisted).
- **Subtitle Cycling** — tekan `T` untuk cycle ke track berikutnya, `Shift+T` untuk matikan.
- **Subtitle Menu** — daftar track subtitle dengan format badge berwarna (ASS=purple, SSA=purple muda, SRT=blue, VTT=teal).
- **On-the-fly switching** — ganti subtitle tanpa reload video.

### 🎮 Discord Rich Presence
- **Activity otomatis** — menampilkan "Watching [Anime Title]", "Episode X • MM:SS / MM:SS", play/pause icon.
- **Real-time sync** — update setiap 15 detik selama playback.
- **Idle state** — menampilkan "Idling • Not playing" saat tidak ada video aktif.
- **Configurable via `.env`** — set `DISCORD_CLIENT_ID` untuk aktifkan integrasi.

### ⚙️ Settings & Preferences
- **Autoplay toggle** — on/off auto-play episode berikutnya.
- **Default Volume** — set volume default tiap kali player dibuka.
- **Preferred Subtitle Language** — pilih dari 9 bahasa.
- **Preferred Subtitle Format** — pilih format subtitle prioritas.
- **Persistent** — semua settings disimpan dengan Zustand `persist` middleware.

### ⌨️ Keyboard Shortcuts

| Tombol        | Aksi                                  |
|---------------|---------------------------------------|
| `Space`       | Play / Pause                          |
| `→`           | Seek forward 10 detik                 |
| `←`           | Seek backward 10 detik                |
| `F`           | Toggle fullscreen                     |
| `M`           | Toggle mute                           |
| `N`           | Next episode                          |
| `S`           | Skip intro/outro                      |
| `T`           | Cycle subtitle track                  |
| `Shift+T`     | Turn off subtitle                     |
| Klik video    | Toggle play/pause                     |

### 🎨 UI/UX
- **Modern Dark Theme** — desain gelap yang nyaman di mata.
- **Tailwind CSS** — utility-first styling untuk konsistensi visual.
- **Smooth Animations** — fade in/out controls, transitions, hover effects.
- **Responsive layout** — sidebar library, episode list, dan player dalam 3-pane layout.
- **Center Mode Switching** — toggle antara landing screen → library settings → player view.
- **Empty States** — pesan informatif saat library kosong atau belum ada episode.

---

## 🚀 Tech Stack

| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| Runtime      | **Electron 39** + electron-vite             |
| UI           | **React 19** + TypeScript 5                 |
| State        | **Zustand 5** (with persist middleware)     |
| Styling      | **Tailwind CSS 3**                          |
| Subtitle     | **ass-compiler** + Canvas API               |
| Discord      | **discord-rpc**                             |
| Storage      | **lowdb** (JSON-based local DB)             |
| Auto-Update  | **electron-updater**                        |
| Packaging    | **electron-builder** (NSIS/DMG/AppImage)    |

---

## 📦 Instalasi

### Prerequisites
- **Node.js** ≥ 20.x
- **npm** atau **pnpm`
- OS: Windows 10/11, macOS, atau Linux

### Install dependencies

```bash
npm install
```

### Konfigurasi (Opsional)

Buat file `.env` di root project untuk Discord Rich Presence:

```env
DISCORD_CLIENT_ID=your_discord_application_id_here
```

_(Tanpa ini, Discord RPC akan otomatis di-skip.)_

---

## 🛠️ Development

### Run dev mode (hot-reload)

```bash
npm run dev
```

### TypeScript type-check

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Format code

```bash
npm run format
```

---

## 🏗️ Build & Distribution

### Build untuk Windows (NSIS installer)

```bash
npm run build:win
```

Output: `dist/Anilocal Player-1.0.0-setup.exe`

### Build untuk macOS (DMG)

```bash
npm run build:mac
```

### Build untuk Linux (AppImage, Snap, deb)

```bash
npm run build:linux
```

### Build unpacked (folder only, untuk testing)

```bash
npm run build:unpack
```

---

## 📖 Cara Pakai

### 1️⃣ Menambahkan Anime ke Library
- Buka sidebar **Library** (ikon folder di kiri atas player).
- Klik **"+ Add Folder"** dan pilih folder berisi file anime.
- Anilocal otomatis scan semua video + subtitle yang matching.

### 2️⃣ Mulai Nonton
- Pilih anime dari sidebar → masuk ke **Library Settings** mode.
- Pilih episode dari daftar → klik **Play**.
- Player akan otomatis load subtitle berdasarkan preferensi.

### 3️⃣ Set Skip Timestamps
**Cara 1 — Manual per episode:**
- Saat video playing, klik ikon ⚙️ "Edit Skip" di kontrol bar.
- Isi `Intro Start`, `Intro End`, `Outro Start`, `Outro End` (format `MM:SS`).

**Cara 2 — Import Skip Pack JSON:**
- Di Library Settings, klik **Import Skip Pack**.
- Pilih file JSON (format array `[ { episodeNumber, introEnd, ... }, ... ]`).
- Skip-timestamp langsung diterapkan ke semua episode matching.

### 4️⃣ Ganti Subtitle
- Klik ikon 💬 subtitle di control bar → pilih dari daftar.
- Atau tekan `T` untuk cycle otomatis.
- Tekan `Shift+T` untuk matikan subtitle.

### 5️⃣ Aktifkan Discord Rich Presence
- Set `DISCORD_CLIENT_ID` di `.env`.
- Jalankan ulang aplikasi.
- Status Discord akan otomatis update selama playback.

---

## 📂 Struktur Project

```
anilocal-player/
├── src/
│   ├── main/                       # Electron main process
│   │   ├── ipc/                    # IPC handlers (folder, subtitle, discord, etc.)
│   │   ├── services/               # Business logic (scan, subtitle, discord, storage)
│   │   └── config/                 # Environment config
│   ├── preload/                    # Preload bridge (contextBridge API)
│   └── renderer/                   # React app
│       └── src/
│           ├── components/         # UI components (player, sidebar, settings, library)
│           ├── hooks/              # Custom React hooks (useVideoPlayer, useSubtitle, etc.)
│           ├── store/              # Zustand stores (player, library, settings, etc.)
│           ├── types/              # TypeScript type definitions
│           └── utils/              # Helper functions
├── electron-builder.yml            # Build config (file associations, platform targets)
├── electron.vite.config.ts         # Vite + Electron config
└── package.json
```

---

## 🗂️ Format Skip Pack JSON

Contoh file JSON yang bisa di-import:

```json
{
  "name": "Frieren Skip Pack",
  "animeTitle": "Frieren",
  "entries": [
    {
      "episodeNumber": 1,
      "introStart": 0,
      "introEnd": 90,
      "outroStart": 1380,
      "outroEnd": 1440
    },
    {
      "episodeNumber": 2,
      "introStart": 5,
      "introEnd": 95,
      "outroStart": 1400,
      "outroEnd": 1460
    }
  ]
}te
```

Atau sebagai array langsung:

```json
[
  { "episodeNumber": 1, "introEnd": 90, "outroStart": 1380 },
  { "episodeNumber": 2, "introEnd": 95, "outroStart": 1400 }
]
```

Field yang didukung: `episodeNumber`, `introStart`, `introEnd`, `outroStart`, `outroEnd`.

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan:

1. **Fork** repository ini.
2. Buat **feature branch** (`git checkout -b feature/AmazingFeature`).
3. **Commit** perubahan (`git commit -m 'Add some AmazingFeature'`).
4. **Push** ke branch (`git push origin feature/AmazingFeature`).
5. Buat **Pull Request**.

Pastikan jalankan `npm run lint` dan `npm run typecheck` sebelum submit PR.

---

## 📝 Lisensi

Distributed under the MIT License. See `LICENSE` untuk detail lengkap.

---

## 👤 Author

**Mohammad Sahrullah**

Dibuat dengan ❤️ dan bantuan AI.
> Powered by AI. Built for anime fans who prefer local playback.
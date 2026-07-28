# Anilocal Player v0.6.2

## Apa yang Baru?

### UI Overhaul (Tailwind CSS)
- Migrasi penuh ke Tailwind CSS dengan design system yang konsisten
- Palet warna, spacing, dan tipografi terstandarisasi di seluruh aplikasi
- Komponen UI baru: `Badge`, `Chip`, `IconButton`, `Toggle`, `Skeleton`, `Spinner`, `StatusMessage`, `ProgressTrack`

### Custom Title Bar & Menu Bar
- Title bar custom dengan logo Anilocal dan drag region
- Menu bar: **File** (Open File/Folder, Exit), **Settings**, **Help** (About, Update)
- Keyboard shortcut: `Ctrl+O` (open file), `Ctrl+Shift+O` (open folder), `Ctrl+,` (settings)

### About Modal
- Help → About menampilkan versi aplikasi dan opsi check update

### Icon System
- Unified icon set dengan stroke width konsisten (1.75)
- Ukuran: `xs`, `sm`, `md`, `lg` — dipakai di semua komponen

### Episode List Improvements
- Thumbnail generation dengan concurrency limit (max 3 ffmpeg process paralel)
- Cache thumbnail per episode — tidak regenerate saat switch anime

### Logo Update
- Logo aplikasi diubah dari ikon play ke logo Anilocal

### Perbaikan & Peningkatan
- **Improvement**: Modal component dengan backdrop blur dan animasi
- **Improvement**: Button component dengan variant (primary, secondary, ghost, danger)
- **Improvement**: Library settings panel yang lebih rapi
- **Improvement**: Video player cleanup — komponen lebih ringkas

---

# Anilocal Player v0.6.1

## Apa yang Baru?

### Auto-Update System
- Check update otomatis dari GitHub Releases saat aplikasi startup
- Update panel di Settings untuk manual check dan download
- Progress bar download dengan kecepatan dan estimasi
- Restart & install setelah download selesai

---

# Anilocal Player v0.6.0

## Apa yang Baru?

### Discord Rich Presence
- Menampilkan aktivitas "Watching [Anime Title]" secara otomatis di Discord
- Sinkronisasi real-time setiap 15 detik selama playback (Episode X • MM:SS / MM:SS)
- Idle state saat tidak ada video aktif
- Konfigurasi via `.env` → `DISCORD_CLIENT_ID`

### File Association & Open With
- Buka file `.mp4/.mkv/.webm/.avi` langsung dari File Explorer (double-click)
- Klik kanan file video → "Open with Anilocal Player"
- Klik kanan link video di browser → buka dengan Anilocal

### Subtitle ASS/SSA (Libass Native Rendering)
- Support format `.ass` dan `.ssa` subtitle fansub
- Rendering native via SubtitlesOctopus (libass WASM) — mendukung styling lengkap: font, warna, outline, shadow, positioning, karaoke
- Sinkronisasi play/pause/seek antara video dan subtitle worker
- Format priority: `ASS > SSA > SRT > VTT`

### Import Skip Pack (.json)
- UI baru untuk import file JSON berisi skip-timestamp massal
- Kompatibel dengan format AniSkip dan sejenisnya
- Langsung diterapkan ke semua episode dalam satu anime

### Perbaikan & Peningkatan
- **Fix**: Video controls tidak muncul saat fullscreen
- **Improvement**: Player controls auto-hide saat idle bahkan di luar fullscreen (selama video diputar)
- **Improvement**: SubtitlesOctopus sync — mengurangi double-rendering, jitter, dan penggunaan CPU/memory
- **Improvement**: UI overhaul pada Settings modal, Library sidebar, dan Player controls
- **Improvement**: Font Outfit sebagai font utama aplikasi
- **Improvement**: Splash screen saat app loading

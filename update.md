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

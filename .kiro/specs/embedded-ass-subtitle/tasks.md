# Implementation Plan: Embedded ASS Subtitle Support

## Overview

Implement embedded ASS subtitle rendering in AniLocal by: (1) adding an `EmbeddedSubtitleService` in the main process that uses bundled ffprobe/ffmpeg to detect and extract subtitle tracks from MKV files, (2) wiring new IPC channels and preload API methods, (3) replacing the canvas `AssRenderer` with a SubtitleOctopus (WebAssembly libass) renderer that falls back to the existing canvas renderer, and (4) extending the subtitle menu and `useSubtitle` hook to surface embedded tracks.

---

## Tasks

- [x] 1. Extend type definitions and configure build tooling
  - [x] 1.1 Update `anime.ts` subtitle types to add `'embedded'` source and optional `trackIndex`
    - Add `'embedded'` to the `SubtitleSource` union in `src/renderer/src/types/anime.ts`
    - Add optional `trackIndex?: number` to the `Subtitle` type
    - _Requirements: 3.5_

  - [x] 1.2 Update preload type declarations for new IPC methods
    - Add `EmbeddedTrackDescriptor` type to `src/preload/index.d.ts`
    - Add `'embedded'` to `SubtitleRecord.source` union and `trackIndex?: number` field
    - Add `probeEmbeddedTracks`, `extractEmbeddedTrack`, and `extractFonts` to the `API` interface in `src/preload/index.d.ts`
    - _Requirements: 8.4_

  - [x] 1.3 Update `electron-vite.config.ts` and `electron-builder.yml` for WASM asset serving
    - Add `assetsInclude: ['**/*.wasm']` to the renderer section of `electron.vite.config.ts`
    - Add `extraResources` entry in `electron-builder.yml` to copy `@jellyfin/libass-wasm/dist/` → `libass/`
    - Extend `asarUnpack` in `electron-builder.yml` to include `node_modules/ffmpeg-static/**` and `node_modules/ffprobe-static/**`
    - _Requirements: 9.3_

- [x] 2. Install dependencies and set up test framework
  - [x] 2.1 Install production dependencies and dev test tooling
    - Add `@jellyfin/libass-wasm`, `ffmpeg-static`, `ffprobe-static` as production dependencies
    - Add `vitest`, `@vitest/coverage-v8`, `fast-check`, `happy-dom` (or `jsdom`) as dev dependencies
    - Add a `vitest.config.ts` at workspace root configured with `environment: 'happy-dom'`
    - Add `"test": "vitest --run"` script to `package.json`
    - _Requirements: 9.1, 9.2_

- [x] 3. Implement `getBinaryPaths` helper in the main process config
  - [x] 3.1 Extend `src/main/config/env.ts` with `getBinaryPaths()`
    - Add `getBinaryPaths(): { ffmpegPath: string; ffprobePath: string }` that reads from `ffmpeg-static`/`ffprobe-static` in dev and replaces `app.asar` → `app.asar.unpacked` in packaged builds
    - _Requirements: 9.5, 8.5_

  - [ ]* 3.2 Write unit tests for `getBinaryPaths`
    - Test dev mode returns paths from the static packages
    - Test packaged mode path contains `app.asar.unpacked`
    - _Requirements: 9.5_

- [x] 4. Implement `EmbeddedSubtitleService`
  - [x] 4.1 Create `src/main/services/embedded-subtitle.service.ts` with `probeEmbeddedTracks`
    - Implement early-exit for non-`.mkv` extensions (return `[]`)
    - Implement `probeEmbeddedTracks(videoPath)` spawning ffprobe with `-print_format json -show_streams`, parse JSON output, filter streams where `codec_type === 'subtitle'`, map to `EmbeddedTrackDescriptor[]` (defaulting language to `"und"` when absent)
    - Add binary availability check (`fs.access` with `X_OK`) on service init; set `extractionAvailable = false` with a warning log if check fails
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 9.4_

  - [ ]* 4.2 Write property test for Property 1: non-MKV files return empty list
    - Generate arbitrary file paths with non-`.mkv` extensions using `fc.string()` + suffix
    - Assert `probeEmbeddedTracks` returns `[]` without calling the spawner
    - **Property 1: Non-MKV files skip probing and return empty track list**
    - **Validates: Requirements 1.6**

  - [ ]* 4.3 Write property test for Property 2: descriptor completeness across arbitrary ffprobe output
    - Generate arbitrary ffprobe JSON payloads with 0–64 subtitle streams using `fc.record`
    - Assert returned array length equals number of subtitle streams, each descriptor has `index >= 0`, non-empty `language` (defaults to `"und"`), non-empty `codecName`
    - **Property 2: Probe result completeness across arbitrary ffprobe output**
    - **Validates: Requirements 1.2, 1.3, 1.5**

  - [x] 4.4 Implement `extractEmbeddedTrack` and in-memory extraction cache
    - Add `extractEmbeddedTrack(videoPath, trackIndex)` that checks cache first, creates session temp dir on first use, spawns ffmpeg to extract the track as `.ass`, stores result in `Map<string, string>` cache, returns absolute path
    - Sanitise output filename (replace `[^A-Za-z0-9_\-.]` with `_`)
    - Delete partial output file on ffmpeg non-zero exit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.5 Write property test for Property 4: extraction caches results
    - Generate arbitrary `(videoPath, trackIndex)` pairs with mocked ffmpeg success
    - Assert spawner invoked exactly once for identical arguments; both calls return path ending in `.ass`
    - **Property 4: Extraction produces absolute .ass path and caches the result**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 4.6 Implement `extractFonts` and session `cleanup`
    - Add `extractFonts(videoPath)` that spawns ffmpeg to dump MKV font attachments into a per-video subfolder; cache results per `videoPath`
    - Add `cleanup()` that deletes the session temp directory; register it on `app.on('before-quit')`
    - _Requirements: 2.6, 7.6_

  - [ ]* 4.7 Write property test for Property 3: ffprobe/ffmpeg failures produce structured error
    - Generate arbitrary non-zero exit codes and stderr strings
    - Assert returned objects contain a non-empty `message` field and no track or path data
    - **Property 3: ffprobe/ffmpeg failure produces structured error with message**
    - **Validates: Requirements 1.4, 2.5_**

  - [ ]* 4.8 Write property test for Property 10: binary unavailability returns structured error
    - With `extractionAvailable = false`, generate arbitrary arguments
    - Assert all calls return `{ error: string }` with non-empty `message` and do not spawn a process
    - **Property 10: Binary unavailability produces structured error for all calls**
    - **Validates: Requirements 9.4**

  - [ ]* 4.9 Write property test for Property 11: non-existent paths return structured error
    - Generate arbitrary paths that do not exist on the filesystem
    - Assert both `probeEmbeddedTracks` and `extractEmbeddedTrack` return `{ error: string }` without spawning a process
    - **Property 11: Non-existent file path yields structured error with message**
    - **Validates: Requirements 8.3**

- [x] 5. Register new IPC handlers and expose preload API
  - [x] 5.1 Extend `src/main/ipc/subtitle.ipc.ts` with three new IPC handlers
    - Register `subtitle:probeEmbeddedTracks` delegating to `embeddedSubtitleService.probeEmbeddedTracks`
    - Register `subtitle:extractEmbeddedTrack` delegating to `embeddedSubtitleService.extractEmbeddedTrack`
    - Register `subtitle:extractFonts` delegating to `embeddedSubtitleService.extractFonts`
    - All handlers return structured error objects (not thrown errors) on failure
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.2 Extend `src/preload/index.ts` with new `window.api` methods
    - Add `probeEmbeddedTracks(videoPath)`, `extractEmbeddedTrack(videoPath, trackIndex)`, `extractFonts(videoPath)` calling the corresponding IPC channels
    - Update `SubtitleRecord` in `preload/index.ts` to add `trackIndex?: number` and `'embedded'` to source union
    - _Requirements: 8.4_

- [x] 6. Checkpoint — Ensure main-process extraction pipeline tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement `SubtitleOctopusRenderer` component
  - [x] 7.1 Create `src/renderer/src/components/player/SubtitleOctopusRenderer.tsx`
    - Add `resolveWorkerUrl(filename)` helper that returns dev (`/@fs/…`) vs packaged (`file://${resourcesPath}/libass/…`) URL; inject `resourcesPath` via an IPC call or a `window.__resourcesPath` constant set from preload
    - Construct `SubtitleOctopus` instance with `{ video, subContent, workerUrl, legacyWorkerUrl, fonts }`
    - Attach a `ResizeObserver` on the video element; call `instance.resize()` on dimension change
    - On `visible` toggle to `false`, call `instance.setIsPaused(true)`; on toggle back to `true`, call `instance.setIsPaused(false)` — do NOT dispose/recreate
    - On `assContent` change, dispose old instance and construct a new one
    - On unmount, dispose instance and disconnect `ResizeObserver`
    - Detect WASM via `typeof WebAssembly !== 'undefined'`; call `onFallback` prop if absent
    - _Requirements: 4.1, 4.3, 4.4, 4.6, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write property test for Property 7: at most one SubtitleOctopus instance at a time
    - Generate sequences of distinct ASS content strings (min length 2)
    - Assert no two `SubtitleOctopus` instances are simultaneously active during any transition
    - **Property 7: At most one SubtitleOctopus instance exists at any point in time**
    - **Validates: Requirements 5.5**

  - [ ]* 7.3 Write property test for Property 8: visibility toggle round-trip preserves instance
    - Generate arbitrary `visible` toggle sequences containing at least one `true → false → true` transition
    - Assert the same instance identity is preserved throughout; no new construction on re-enable
    - **Property 8: Visibility toggle round-trip preserves the active instance**
    - **Validates: Requirements 4.6**

  - [ ]* 7.4 Write property test for Property 9: overlay dimensions match video after resize
    - Generate random `(width, height)` pairs via `fc.tuple(fc.nat(), fc.nat())`
    - Assert the overlay container dimensions equal the new video element dimensions after `ResizeObserver` callback fires
    - **Property 9: Overlay container dimensions always match the video element after resize**
    - **Validates: Requirements 7.7, 6.4**

  - [ ]* 7.5 Write property test for Property 12: video element properties unchanged by overlay operations
    - Generate arbitrary sequences of overlay operations (construct, content change, resize, visibility toggle, dispose)
    - Assert all observable `HTMLVideoElement` properties are identical before and after each operation
    - **Property 12: Video element properties are not modified by overlay operations**
    - **Validates: Requirements 6.5**

- [x] 8. Refactor `AssRenderer.tsx` as WASM/legacy router
  - [x] 8.1 Rename existing canvas rendering logic in `AssRenderer.tsx` to `LegacyAssRenderer` and add wrapper routing
    - Move the existing canvas renderer code into a `LegacyAssRenderer` internal component (same file)
    - Make `AssRenderer` the public export: render `SubtitleOctopusRenderer` by default; on `onFallback`, switch to `LegacyAssRenderer`
    - Add `fonts?: string[]` to `AssRendererProps` and pass it through to `SubtitleOctopusRenderer`
    - Public prop shape remains `{ assContent, videoRef, visible, fonts? }` — no changes needed in `VideoPlayer.tsx` beyond adding `fonts` prop
    - _Requirements: 4.1, 6.6_

- [x] 9. Extend `useSubtitle` hook to handle embedded tracks
  - [x] 9.1 Add embedded-track extraction path to `useSubtitle.ts`
    - When `selectedSubtitle.source === 'embedded'`, call `window.api.extractEmbeddedTrack(videoPath, trackIndex)` to get the path, then `window.api.readSubtitleFile(extractedPath)` to load content
    - Simultaneously call `window.api.extractFonts(videoPath)` and convert results to `file://` URLs via `window.api.toFileUrl`
    - Expose `fontUrls: string[]` in the returned state object
    - Accept `videoPath: string` as a new parameter to the hook
    - _Requirements: 3.3, 3.4_

  - [ ]* 9.2 Write property test for Property 5: embedded source routes to extraction IPC, not direct file read
    - Generate `Subtitle` objects with `source === 'embedded'` and arbitrary `trackIndex` values
    - Assert `extractEmbeddedTrack` is invoked; assert `readSubtitleFile` is NOT called with the synthetic `embedded:{trackIndex}` path
    - **Property 5: Embedded subtitle source routes to extraction IPC, not file read**
    - **Validates: Requirements 3.3**

- [x] 10. Extend `SubtitleMenu.tsx` to display embedded tracks
  - [x] 10.1 Update `SubtitleMenu.tsx` to sort and badge embedded tracks
    - Sort incoming `subtitles` array so `source === 'embedded'` entries appear before `source === 'external'` entries
    - Render a distinct `EMBEDDED` badge (e.g. `bg-green-700 text-green-100`) for embedded tracks
    - Use `embedded:{trackIndex}` as the React key for embedded entries
    - Update `FORMAT_BADGE_COLORS` map to include `.ass` default for embedded entries
    - _Requirements: 3.1, 3.2_

  - [ ]* 10.2 Write property test for Property 6: embedded tracks always appear before external tracks
    - Generate arbitrary mixed arrays of embedded + external `Subtitle` objects (min one of each)
    - Assert rendered order places every embedded track before every external track
    - **Property 6: Embedded tracks are always ordered before external tracks in the menu**
    - **Validates: Requirements 3.2**

- [x] 11. Wire embedded track detection into `VideoPlayer.tsx` and player store
  - [x] 11.1 Call `probeEmbeddedTracks` when an MKV episode loads and merge results into subtitle list
    - In `VideoPlayer.tsx` (or a new `useEmbeddedTracks` hook), call `window.api.probeEmbeddedTracks(episode.filePath)` when `currentEpisode` changes and the file is `.mkv`
    - Map `EmbeddedTrackDescriptor[]` to `Subtitle[]` with `source: 'embedded'`, `extension: '.ass'`, `path: 'embedded:{index}'`, and a display label like `"{language} (Embedded ASS)"`
    - Merge embedded tracks (prepended) with the episode's existing `subtitles` array and pass the combined list to `useSubtitle`
    - Pass `currentEpisode.filePath` as `videoPath` to `useSubtitle`
    - Pass `fontUrls` from `useSubtitle` down to `AssRenderer` as `fonts` prop
    - _Requirements: 3.1, 3.2, 3.6, 1.6_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints at steps 6 and 12 ensure incremental validation of each layer
- Property tests validate universal correctness invariants (fast-check, min 100 iterations each)
- Unit tests validate specific examples and error conditions
- The WASM worker URL resolution for packaged builds requires `resourcesPath` to be injected from the main process into the renderer (via a preload constant or IPC call) before `SubtitleOctopusRenderer` mounts

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "2.1"] },
    { "id": 1, "tasks": ["3.1", "4.1"] },
    { "id": 2, "tasks": ["3.2", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["4.5", "4.6", "4.7", "4.8", "4.9", "5.1"] },
    { "id": 4, "tasks": ["5.2"] },
    { "id": 5, "tasks": ["7.1", "9.1", "10.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "8.1", "9.2", "10.2"] },
    { "id": 7, "tasks": ["11.1"] }
  ]
}
```

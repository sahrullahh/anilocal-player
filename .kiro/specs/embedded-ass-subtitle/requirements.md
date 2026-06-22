# Requirements Document

## Introduction

This feature adds MPV/libass-quality ASS subtitle rendering to AniLocal's HTML5-based player. Currently, AniLocal supports only external `.ass` files via a basic canvas renderer (`AssRenderer.tsx` using `ass-compiler`). This feature extends the system to:

1. Detect and extract embedded ASS subtitle tracks from MKV files using ffprobe/ffmpeg in the Electron main process.
2. Replace the basic `ass-compiler` canvas renderer with a WebAssembly libass implementation (SubtitleOctopus) for visual parity with MPV.
3. Keep synchronization accurate across seek, pause/resume, and playback speed changes.
4. Expose embedded tracks alongside external tracks in the existing subtitle selection UI.

The HTML5 `<video>` engine remains the playback backend. No MKV demuxer in JavaScript and no MPV engine integration are in scope.

---

## Glossary

- **ASS / SSA**: Advanced SubStation Alpha — a subtitle format that supports rich styling, positioning, animation, and karaoke tags.
- **MKV**: Matroska container format, which may contain one or more embedded subtitle tracks.
- **Embedded subtitle track**: A subtitle stream muxed inside an MKV file, as opposed to a separate external `.ass` file.
- **External subtitle**: A standalone `.ass`, `.srt`, or `.vtt` file alongside the video file.
- **ffprobe**: Command-line tool that inspects media file metadata, including subtitle track information.
- **ffmpeg**: Command-line tool used to transcode/extract media streams; used here to extract ASS tracks from MKV.
- **SubtitleOctopus**: A WebAssembly port of libass that renders ASS subtitles in the browser with near-identical output to MPV.
- **libass**: The reference ASS rendering library used by MPV.
- **Extraction_Service**: The Electron main-process service responsible for invoking ffprobe and ffmpeg to detect and extract subtitle tracks.
- **Renderer_Process**: The Electron renderer (React) that handles video playback and subtitle display.
- **Subtitle_Overlay**: The transparent canvas/WebGL layer positioned over the HTML5 `<video>` element on which subtitles are drawn.
- **Subtitle_Track**: A single subtitle stream within an MKV file, identified by a zero-based stream index.
- **Track_Index**: The stream index used by ffmpeg to address a specific subtitle track (e.g., `0:s:0`).
- **Temp_Directory**: A writable temporary directory used to store extracted `.ass` files; scoped per session.
- **PlayRes**: The reference resolution declared in an ASS script's `[Script Info]` section (`PlayResX` × `PlayResY`).
- **Video_Element**: The HTML5 `<video>` DOM element managed by `VideoPlayer.tsx`.
- **useSubtitle_Hook**: The existing React hook (`useSubtitle.ts`) that manages subtitle selection and content loading.
- **SubtitleMenu**: The existing React component (`SubtitleMenu.tsx`) that presents the subtitle track list to the user.

---

## Requirements

---

### Requirement 1: Detect Embedded Subtitle Tracks in MKV Files

**User Story:** As a viewer, I want AniLocal to automatically detect subtitle tracks embedded inside MKV files, so that I can choose from all available subtitles without managing separate files.

#### Acceptance Criteria

1. WHEN a video file with the `.mkv` extension is opened, THE Extraction_Service SHALL invoke ffprobe to inspect the file for subtitle streams.
2. WHEN ffprobe returns subtitle stream metadata, THE Extraction_Service SHALL produce a list of track descriptors containing: stream index, codec name, and language tag (from the stream's `tags.language` field, defaulting to `"und"` when absent).
3. WHEN an MKV file contains no subtitle streams, THE Extraction_Service SHALL return an empty track list without producing an error.
4. IF ffprobe exits with a non-zero code or cannot be located, THEN THE Extraction_Service SHALL return an error describing the failure reason.
5. THE Extraction_Service SHALL support MKV files containing at least 32 subtitle tracks without truncating the detected track list.
6. WHEN a video file has an extension other than `.mkv`, THE Extraction_Service SHALL skip ffprobe probing and return an empty track list immediately.

---

### Requirement 2: Extract an Embedded Subtitle Track to ASS Format

**User Story:** As a viewer, I want the selected embedded subtitle track to be extracted as an ASS file, so that the renderer can display it.

#### Acceptance Criteria

1. WHEN the user selects an embedded subtitle track, THE Extraction_Service SHALL invoke ffmpeg to extract that track from the MKV file into a `.ass` file in the Temp_Directory.
2. THE Extraction_Service SHALL use the Track_Index supplied by the detection step to address the correct stream during extraction.
3. WHEN extraction completes successfully, THE Extraction_Service SHALL return the absolute file path of the extracted `.ass` file.
4. WHEN an extracted `.ass` file already exists for the same video file and Track_Index, THE Extraction_Service SHALL return the cached file path without re-invoking ffmpeg.
5. IF ffmpeg exits with a non-zero code during extraction, THEN THE Extraction_Service SHALL delete any partial output file and return an error describing the failure.
6. WHEN the application closes, THE Extraction_Service SHALL delete all `.ass` files written to the Temp_Directory during that session.
7. THE Extraction_Service SHALL complete extraction of a typical anime subtitle track (under 2 MB) within 5 seconds on the host machine.

---

### Requirement 3: Expose Embedded Tracks in the Subtitle Selection Menu

**User Story:** As a viewer, I want embedded subtitle tracks to appear alongside external subtitle files in the subtitle menu, so that I can choose any available track from a single list.

#### Acceptance Criteria

1. WHEN an MKV file is opened and embedded tracks are detected, THE SubtitleMenu SHALL display each embedded track as a selectable entry labelled with the track's language and its origin (e.g. `"English (Embedded ASS)"`).
2. THE SubtitleMenu SHALL list embedded tracks before external tracks in the selection list.
3. WHEN a `source` field value of `"embedded"` is present on a Subtitle entry, THE useSubtitle_Hook SHALL trigger extraction via IPC instead of reading a file path directly.
4. WHEN the user selects an embedded track, THE useSubtitle_Hook SHALL request extraction, await the extracted file path, and then load the ASS content from that path.
5. THE Subtitle type in `anime.ts` SHALL accept `"embedded"` as a valid value for the `source` field.
6. WHEN embedded track detection fails or returns zero tracks for an MKV file, THE SubtitleMenu SHALL not display any embedded track entries for that file and SHALL continue to show external tracks if present.

---

### Requirement 4: Render ASS Subtitles with SubtitleOctopus (WebAssembly libass)

**User Story:** As a viewer, I want embedded ASS subtitles rendered with libass-quality output, so that fansub-style effects look the same as they do in MPV.

#### Acceptance Criteria

1. THE Subtitle_Overlay SHALL render ASS subtitles using SubtitleOctopus (the WebAssembly libass implementation) rather than the `ass-compiler` canvas renderer.
2. THE Subtitle_Overlay SHALL support the following ASS tag categories: font styling (`\fn`, `\fs`, `\b`, `\i`, `\u`, `\s`), colour tags (`\c`, `\1c`–`\4c`, alpha tags `\alpha`, `\1a`–`\4a`), positioning (`\pos`, `\an`, `\move`), transforms (`\t`), fades (`\fad`, `\fade`), karaoke (`\k`, `\kf`, `\ko`), and layer ordering via the `Layer` field.
3. WHEN the ASS script declares a PlayRes, THE Subtitle_Overlay SHALL scale all subtitle positions and sizes proportionally to the current Video_Element display dimensions.
4. THE Subtitle_Overlay SHALL be positioned as a transparent layer that exactly covers the Video_Element display area, with a CSS `z-index` above the video and below player controls.
5. THE Subtitle_Overlay SHALL not use the HTML5 `<track>` element or the WebVTT pipeline for ASS content.
6. WHEN `visible` is `false`, THE Subtitle_Overlay SHALL clear all rendered content without destroying the SubtitleOctopus instance.
7. THE Subtitle_Overlay SHALL render each frame within 16 ms of the corresponding animation frame callback to maintain 60 fps display.

---

### Requirement 5: Synchronize Subtitle Rendering with Video Playback

**User Story:** As a viewer, I want subtitles to stay in sync with the video during normal play, seek, pause, and speed changes, so that dialogue always matches the action on screen.

#### Acceptance Criteria

1. WHILE the Video_Element is playing, THE Subtitle_Overlay SHALL update rendered subtitles on every animation frame using `video.currentTime` as the reference timestamp.
2. WHEN the user seeks to a new position, THE Subtitle_Overlay SHALL clear the current frame and re-render using the post-seek `video.currentTime` within one rendered frame.
3. WHEN the Video_Element is paused, THE Subtitle_Overlay SHALL hold the last rendered frame without consuming additional CPU for animation updates.
4. WHEN the `playbackRate` of the Video_Element changes, THE Subtitle_Overlay SHALL continue to derive timing exclusively from `video.currentTime` so that subtitle display automatically tracks the new rate.
5. WHEN a new ASS file is loaded into the Subtitle_Overlay, THE Subtitle_Overlay SHALL discard any previously loaded script and reinitialize the SubtitleOctopus instance with the new content before rendering begins.
6. IF `video.currentTime` is unavailable or the Video_Element reference is null, THEN THE Subtitle_Overlay SHALL render nothing until a valid reference is restored.

---

### Requirement 6: Subtitle Rendering Layer Architecture

**User Story:** As a developer, I want the subtitle overlay to be architecturally separate from the HTML5 video element, so that playback stability is preserved and subtitles can be toggled without affecting video.

#### Acceptance Criteria

1. THE Subtitle_Overlay SHALL be implemented as a React component that renders a single `<canvas>` (or a SubtitleOctopus-managed container) positioned absolutely over the Video_Element.
2. THE Subtitle_Overlay SHALL receive the video element reference and ASS content as props, with no direct dependency on global player state stores.
3. WHEN the Subtitle_Overlay component unmounts, THE Subtitle_Overlay SHALL dispose of the SubtitleOctopus instance and cancel any pending animation frame callbacks to prevent memory leaks.
4. THE Subtitle_Overlay SHALL remain functional when the player enters fullscreen mode by responding to Video_Element resize events and updating its dimensions accordingly.
5. THE Subtitle_Overlay SHALL not modify any property of the Video_Element.
6. WHERE the host machine does not support WebAssembly, THE Subtitle_Overlay SHALL log an error and fall back to the existing `ass-compiler` canvas renderer.

---

### Requirement 7: ASS Subtitle Rendering Visual Fidelity

**User Story:** As a viewer, I want the subtitle output to visually match MPV as closely as possible for fansub-style releases, so that typesetting and karaoke effects display correctly.

#### Acceptance Criteria

1. WHEN rendering a subtitle event that uses `\pos` or `\an` override tags, THE Subtitle_Overlay SHALL honour the declared absolute or alignment-relative position rather than defaulting to a fixed screen edge.
2. WHEN rendering a subtitle event that contains a `\move` tag, THE Subtitle_Overlay SHALL animate the subtitle's position linearly between the start and end coordinates over the declared time range.
3. WHEN rendering a subtitle event that uses `\fad` or `\fade`, THE Subtitle_Overlay SHALL apply the declared alpha transition at the correct times relative to the event's `Start` and `End` timestamps.
4. WHEN rendering a karaoke subtitle using `\kf`, THE Subtitle_Overlay SHALL progressively highlight each syllable at the syllable's start time, matching the fill-sweep timing used by MPV.
5. WHEN rendering a subtitle event that uses `\t` transforms, THE Subtitle_Overlay SHALL interpolate the declared style properties across the transform's time range.
6. WHEN an ASS script specifies a font that is embedded as an attachment in the MKV file, THE Extraction_Service SHALL also extract those font attachments and THE Subtitle_Overlay SHALL load them before rendering begins.
7. WHEN the player window is resized, THE Subtitle_Overlay SHALL re-scale all positions and sizes proportionally to the new Video_Element dimensions without requiring a reload of the ASS content.

---

### Requirement 8: IPC Bridge for Subtitle Extraction

**User Story:** As a developer, I want a clean IPC API between the main process and renderer for subtitle extraction, so that the renderer can request extraction without directly invoking Node.js APIs.

#### Acceptance Criteria

1. THE Extraction_Service SHALL expose an IPC handler named `subtitle:probeEmbeddedTracks` that accepts an absolute MKV file path and returns an array of track descriptors `{ index: number, language: string, codecName: string }`.
2. THE Extraction_Service SHALL expose an IPC handler named `subtitle:extractEmbeddedTrack` that accepts an absolute MKV file path and a Track_Index and returns the absolute path of the extracted `.ass` file.
3. WHEN `subtitle:probeEmbeddedTracks` or `subtitle:extractEmbeddedTrack` are called with a path that does not exist on the filesystem, THE Extraction_Service SHALL return an error object with a human-readable `message` field.
4. THE preload script SHALL expose `probeEmbeddedTracks` and `extractEmbeddedTrack` as callable methods on `window.api` with correct TypeScript types.
5. THE Extraction_Service SHALL locate the ffprobe and ffmpeg binaries using the application's configured binary path (via the existing environment config pattern in `src/main/config/env.ts`), and SHALL NOT hard-code absolute paths to system binaries.

---

### Requirement 9: ffmpeg / ffprobe Binary Availability

**User Story:** As a developer, I want ffmpeg and ffprobe to be reliably available at runtime in both development and packaged builds, so that subtitle extraction works for end users without manual setup.

#### Acceptance Criteria

1. THE Extraction_Service SHALL resolve the ffmpeg binary path using `ffmpeg-static` or an equivalent bundled binary package that is declared as a production dependency.
2. THE Extraction_Service SHALL resolve the ffprobe binary path using `ffprobe-static` or an equivalent bundled binary package that is declared as a production dependency.
3. WHEN the application is packaged by `electron-builder`, the ffmpeg and ffprobe binaries SHALL be included in the `extraResources` bundle and remain executable on the target platform (Windows 64-bit as primary target).
4. IF the resolved binary path does not point to an executable file at startup, THEN THE Extraction_Service SHALL emit a warning to the main-process log and mark extraction as unavailable for the session.
5. WHERE the `NODE_ENV` is `"development"`, THE Extraction_Service SHALL resolve binaries from the `node_modules` package paths rather than the packaged resources directory.

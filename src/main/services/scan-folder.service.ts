import { promises as fs } from 'fs'
import path from 'path'

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.avi'])
const SUBTITLE_EXTENSIONS = ['.vtt', '.srt']

export type EpisodeFile = {
  id: string
  title: string
  fileName: string
  filePath: string
  folderPath: string
  extension: string
  size: number
  modifiedAt: string
  subtitles: { label: string; path: string; extension: string }[]
}

export type ScanResult = {
  name: string
  path: string
  episodes: EpisodeFile[]
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return walk(fullPath)
      return fullPath
    })
  )

  return files.flat()
}

function findSubtitles(videoPath: string, allFiles: string[]) {
  const parsed = path.parse(videoPath)
  return SUBTITLE_EXTENSIONS.map((extension) => ({
    extension,
    path: path.join(parsed.dir, `${parsed.name}${extension}`)
  }))
    .filter((candidate) => allFiles.includes(candidate.path))
    .map((candidate) => ({
      label: path.basename(candidate.path),
      path: candidate.path,
      extension: candidate.extension
    }))
}

export async function scanAnimeFolder(folderPath: string): Promise<ScanResult> {
  const allFiles = await walk(folderPath)
  const videoFiles = allFiles
    .filter((filePath) => VIDEO_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .sort((a, b) => naturalCompare(a, b))

  const episodes = await Promise.all(
    videoFiles.map(async (filePath) => {
      const stats = await fs.stat(filePath)
      return {
        id: filePath,
        title: path.basename(filePath),
        fileName: path.basename(filePath),
        filePath,
        folderPath: path.dirname(filePath),
        extension: path.extname(filePath).toLowerCase(),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        subtitles: findSubtitles(filePath, allFiles)
      }
    })
  )

  return {
    name: path.basename(folderPath),
    path: folderPath,
    episodes
  }
}

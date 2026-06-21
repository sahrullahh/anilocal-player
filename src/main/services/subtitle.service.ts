import { promises as fs } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

/**
 * Convert a .srt file to .vtt (WebVTT) for use in <track> elements.
 * The converted file is written next to the source as *.generated.vtt.
 */
export async function convertSrtToVtt(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8')
  const normalized = content.replace(/\r/g, '')
  const converted = `WEBVTT\n\n${normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, (_, a, b) => `${a}.${b}`)}`
  const outputPath = path.join(path.dirname(filePath), `${path.parse(filePath).name}.generated.vtt`)
  await fs.writeFile(outputPath, converted, 'utf-8')
  return outputPath
}

/**
 * Read a subtitle file and return its raw text content.
 * Used by the renderer's ASS renderer to get the raw .ass/.ssa content.
 */
export async function readSubtitleFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8')
}

/**
 * Convert a local filesystem path to a file:// URL.
 * Uses Node's pathToFileURL for proper cross-platform handling.
 */
export function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href
}

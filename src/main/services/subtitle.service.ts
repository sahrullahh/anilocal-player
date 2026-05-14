import { promises as fs } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

function formatTimestamp(value: string): string {
  return value.replace(',', '.')
}

export async function convertSrtToVtt(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8')
  const normalized = content.replace(/\r/g, '')
  const converted = `WEBVTT\n\n${normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, (_, a, b) => `${a}.${b}`)}`
  const outputPath = path.join(path.dirname(filePath), `${path.parse(filePath).name}.generated.vtt`)
  await fs.writeFile(outputPath, converted, 'utf-8')
  return outputPath
}

export function toFileUrl(filePath: string): string {
  // Use Node's pathToFileURL for proper cross-platform file URL conversion
  return pathToFileURL(filePath).href
}

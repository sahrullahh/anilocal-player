import path from 'path'

export function getFileName(filePath: string): string {
  return path.basename(filePath)
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase()
}

export function getFileNameWithoutExtension(filePath: string): string {
  const fileName = path.basename(filePath)
  return fileName.substring(0, fileName.lastIndexOf('.')) || fileName
}

export function getDirectoryName(filePath: string): string {
  return path.basename(path.dirname(filePath))
}

import { promises as fs } from 'fs'
import { dialog, BrowserWindow } from 'electron'

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return Buffer.from(base64, 'base64')
}

export async function exportPng(
  win: BrowserWindow | null,
  dataUrl: string,
  defaultName: string
): Promise<{ canceled: boolean; path?: string; error?: string }> {
  const res = await dialog.showSaveDialog(win!, {
    title: 'Экспорт в PNG',
    defaultPath: `${defaultName}.png`,
    filters: [{ name: 'PNG', extensions: ['png'] }]
  })
  if (res.canceled || !res.filePath) return { canceled: true }
  try {
    await fs.writeFile(res.filePath, dataUrlToBuffer(dataUrl))
    return { canceled: false, path: res.filePath }
  } catch (e) {
    return { canceled: false, error: (e as Error).message }
  }
}

export async function exportSvg(
  win: BrowserWindow | null,
  svg: string,
  defaultName: string
): Promise<{ canceled: boolean; path?: string; error?: string }> {
  const res = await dialog.showSaveDialog(win!, {
    title: 'Экспорт в SVG',
    defaultPath: `${defaultName}.svg`,
    filters: [{ name: 'SVG', extensions: ['svg'] }]
  })
  if (res.canceled || !res.filePath) return { canceled: true }
  try {
    await fs.writeFile(res.filePath, svg, 'utf8')
    return { canceled: false, path: res.filePath }
  } catch (e) {
    return { canceled: false, error: (e as Error).message }
  }
}

export async function exportPdf(
  win: BrowserWindow | null,
  pdfBytes: ArrayBuffer | Uint8Array,
  defaultName: string
): Promise<{ canceled: boolean; path?: string; error?: string }> {
  const res = await dialog.showSaveDialog(win!, {
    title: 'Экспорт в PDF',
    defaultPath: `${defaultName}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (res.canceled || !res.filePath) return { canceled: true }
  try {
    await fs.writeFile(res.filePath, Buffer.from(pdfBytes as Uint8Array))
    return { canceled: false, path: res.filePath }
  } catch (e) {
    return { canceled: false, error: (e as Error).message }
  }
}

export async function saveCsv(
  win: BrowserWindow | null,
  csv: string,
  defaultName: string
): Promise<{ canceled: boolean; path?: string; error?: string }> {
  const res = await dialog.showSaveDialog(win!, {
    title: 'Экспорт CSV',
    defaultPath: `${defaultName}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (res.canceled || !res.filePath) return { canceled: true }
  try {
    await fs.writeFile(res.filePath, '\ufeff' + csv, 'utf8')
    return { canceled: false, path: res.filePath }
  } catch (e) {
    return { canceled: false, error: (e as Error).message }
  }
}

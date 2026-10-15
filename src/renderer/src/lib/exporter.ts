import { jsPDF } from 'jspdf'
import type { ZigzagProject } from '../../../shared/types'
import { projectToSvg } from './svgExport'
import { printHtml } from './assetCard'

function svgDimensions(svg: string): { width: number; height: number } {
  const w = Number(/width="(\d+)"/.exec(svg)?.[1] ?? 800)
  const h = Number(/height="(\d+)"/.exec(svg)?.[1] ?? 600)
  return { width: w, height: h }
}

export async function svgToImage(
  svg: string,
  scale = 2
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { width, height } = svgDimensions(svg)
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG rasterization failed'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

export async function exportProjectSvg(project: ZigzagProject): Promise<void> {
  const svg = projectToSvg(project)
  await window.zigzag.exports.svg(svg, project.meta.name || 'topology')
}

export async function exportProjectPng(project: ZigzagProject): Promise<void> {
  const svg = projectToSvg(project)
  const { dataUrl } = await svgToImage(svg, 2)
  await window.zigzag.exports.png(dataUrl, project.meta.name || 'topology')
}

export async function printProject(project: ZigzagProject): Promise<void> {
  const svg = projectToSvg(project)
  const { dataUrl } = await svgToImage(svg, 2)
  printHtml(
    `<html><head><title>${project.meta.name || 'topology'}</title></head><body style="margin:0">` +
      `<img src="${dataUrl}" style="width:100%"/></body></html>`
  )
}

export async function exportProjectPdf(project: ZigzagProject): Promise<void> {
  const svg = projectToSvg(project)
  const { dataUrl, width, height } = await svgToImage(svg, 2)
  const orientation = width >= height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 24
  const ratio = Math.min((pageW - margin * 2) / width, (pageH - margin * 2) / height)
  const w = width * ratio
  const h = height * ratio
  pdf.setFontSize(14)
  pdf.text(`Зигзаг Нуля — ${project.meta.name || 'Топология'}`, margin, margin)
  pdf.addImage(dataUrl, 'PNG', margin, margin + 8, w, h)
  const bytes = pdf.output('arraybuffer')
  await window.zigzag.exports.pdf(bytes, project.meta.name || 'topology')
}

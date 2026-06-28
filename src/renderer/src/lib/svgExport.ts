import type { ZigzagProject } from '../../../shared/types'
import { DEVICE_ICONS } from './deviceIcons'

export const NODE_W = 72
export const NODE_H = 72

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function computeBounds(project: ZigzagProject): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const acc = (x: number, y: number): void => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  for (const z of project.zones) {
    acc(z.x, z.y)
    acc(z.x + z.width, z.y + z.height)
  }
  for (const n of project.nodes) {
    acc(n.x - NODE_W / 2, n.y - NODE_H / 2)
    acc(n.x + NODE_W / 2, n.y + NODE_H / 2 + 18)
  }
  for (const l of project.labels) acc(l.x, l.y)
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 800, maxY: 600 }
  return { minX, minY, maxX, maxY }
}

export function projectToSvg(project: ZigzagProject): string {
  const b = computeBounds(project)
  const pad = 40
  const width = Math.ceil(b.maxX - b.minX + pad * 2)
  const height = Math.ceil(b.maxY - b.minY + pad * 2)
  const ox = -b.minX + pad
  const oy = -b.minY + pad
  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))
  const parts: string[] = []

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  )
  parts.push(`<rect width="${width}" height="${height}" fill="#f8fafc"/>`)

  // Zones (under everything).
  for (const z of project.zones) {
    parts.push(
      `<rect x="${z.x + ox}" y="${z.y + oy}" width="${z.width}" height="${z.height}" rx="8" fill="${z.fill}" fill-opacity="${z.opacity}" stroke="${z.fill}" stroke-opacity="0.6"/>`
    )
    if (z.label) {
      parts.push(
        `<text x="${z.x + ox + 8}" y="${z.y + oy + 18}" font-family="sans-serif" font-size="13" fill="#334155">${esc(z.label)}</text>`
      )
    }
  }

  // Links.
  for (const l of project.links) {
    const a = nodeById.get(l.fromNodeId)
    const c = nodeById.get(l.toNodeId)
    if (!a || !c) continue
    const color = l.color ?? (l.source === 'manual' ? '#64748b' : '#2563eb')
    const dash = l.dashed || l.source === 'traceroute' ? ' stroke-dasharray="6 4"' : ''
    parts.push(
      `<line x1="${a.x + ox}" y1="${a.y + oy}" x2="${c.x + ox}" y2="${c.y + oy}" stroke="${color}" stroke-width="2"${dash}/>`
    )
    if (l.label) {
      const mx = (a.x + c.x) / 2 + ox
      const my = (a.y + c.y) / 2 + oy
      parts.push(
        `<text x="${mx}" y="${my - 4}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#475569">${esc(l.label)}</text>`
      )
    }
  }

  // Nodes.
  for (const n of project.nodes) {
    const def = DEVICE_ICONS[n.type]
    const x = n.x + ox
    const y = n.y + oy
    const left = x - NODE_W / 2
    const top = y - NODE_H / 2
    parts.push(
      `<rect x="${left}" y="${top}" width="${NODE_W}" height="${NODE_H}" rx="12" fill="#ffffff" stroke="${def.color}" stroke-width="2"/>`
    )
    // icon: viewBox 24 -> scale to 40, centered
    const scale = 40 / 24
    const iconX = x - 20
    const iconY = top + 8
    parts.push(
      `<g transform="translate(${iconX} ${iconY}) scale(${scale})"><path d="${def.path}" fill="none" stroke="${def.color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>`
    )
    parts.push(
      `<text x="${x}" y="${top + NODE_H + 14}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#0f172a">${esc(n.label)}</text>`
    )
    if (n.ping.enabled) {
      parts.push(`<circle cx="${left + NODE_W - 8}" cy="${top + 8}" r="5" fill="#22c55e" stroke="#fff" stroke-width="1.5"/>`)
    }
    if (n.web.enabled) {
      parts.push(`<circle cx="${left + 8}" cy="${top + 8}" r="6" fill="#0ea5e9"/>`)
    }
    if (n.note.enabled) {
      parts.push(`<circle cx="${left + 8}" cy="${top + NODE_H - 8}" r="6" fill="#f59e0b"/>`)
    }
  }

  // Free text labels.
  for (const t of project.labels) {
    parts.push(
      `<text x="${t.x + ox}" y="${t.y + oy}" font-family="sans-serif" font-size="${t.fontSize}" fill="${t.color}">${esc(t.text)}</text>`
    )
  }

  parts.push('</svg>')
  return parts.join('\n')
}

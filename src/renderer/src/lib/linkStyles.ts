import type { LinkMedium, TopologyLink } from '../../../shared/types'

export interface LinkMediumDef {
  name: string
  color: string
  width: number
  dash?: number[]
  /** Small glyph drawn at the link midpoint. */
  badge?: string
}

export const LINK_MEDIA: Record<LinkMedium, LinkMediumDef> = {
  ethernet: { name: 'Обычный (Ethernet)', color: '#64748b', width: 2 },
  secure: { name: 'Защищённый канал', color: '#16a34a', width: 3, badge: '🔒' },
  wifi: { name: 'Wi-Fi', color: '#0ea5e9', width: 2, dash: [3, 5], badge: '📶' },
  optical: { name: 'Оптический канал', color: '#ea580c', width: 3, badge: '💡' },
  radio: { name: 'Радиоканал', color: '#9333ea', width: 2, dash: [12, 4, 2, 4], badge: '📡' }
}

export const LINK_MEDIUM_TYPES = Object.keys(LINK_MEDIA) as LinkMedium[]

export interface ResolvedLinkStyle {
  color: string
  width: number
  dash?: number[]
  badge?: string
}

export function resolveLinkStyle(l: TopologyLink): ResolvedLinkStyle {
  if (l.medium) {
    const def = LINK_MEDIA[l.medium]
    return {
      color: l.color ?? def.color,
      width: def.width,
      dash: l.dashed && !def.dash ? [6, 4] : def.dash,
      badge: def.badge
    }
  }
  return {
    color: l.color ?? (l.source === 'manual' ? '#64748b' : '#2563eb'),
    width: 2,
    dash: l.dashed || l.source === 'traceroute' ? [6, 4] : undefined
  }
}

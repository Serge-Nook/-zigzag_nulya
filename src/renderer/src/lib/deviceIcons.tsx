import type { DeviceType } from '../../../shared/types'

export interface IconDef {
  name: string
  color: string
  /** SVG path data drawn in a 24x24 viewBox. */
  path: string
}

// A compact built-in library of vector network-device glyphs.
export const DEVICE_ICONS: Record<DeviceType, IconDef> = {
  router: {
    name: 'Маршрутизатор',
    color: '#2563eb',
    path: 'M3 13h18v6H3z M7 16h2v1H7z M11 16h2v1h-2z M15 16h2v1h-2z M8 12V6 M8 6l-2 2 M8 6l2 2 M16 12V6 M16 6l-2 2 M16 6l2 2'
  },
  switch: {
    name: 'Коммутатор (свитч)',
    color: '#0891b2',
    path: 'M3 9h18v8H3z M6 12h2v2H6z M10 12h2v2h-2z M14 12h2v2h-2z M18 12h1v2h-1z M5 6h6 M11 6l-2-1.5 M11 6l-2 1.5'
  },
  firewall: {
    name: 'Межсетевой экран',
    color: '#dc2626',
    path: 'M3 5h18v14H3z M3 9h18 M3 13h18 M3 17h18 M9 5v4 M15 5v4 M6 9v4 M12 9v4 M18 9v4 M9 13v4 M15 13v4'
  },
  server: {
    name: 'Сервер',
    color: '#7c3aed',
    path: 'M5 3h14v8H5z M5 13h14v8H5z M8 6h1v1H8z M8 16h1v1H8z M11 6h5v1h-5z M11 16h5v1h-5z'
  },
  pc: {
    name: 'ПК',
    color: '#16a34a',
    path: 'M3 4h18v12H3z M5 6h14v8H5z M9 18h6 M8 21h8 M9 18v3 M15 18v3'
  },
  laptop: {
    name: 'Ноутбук',
    color: '#16a34a',
    path: 'M5 5h14v9H5z M7 7h10v5H7z M2 16h20l-2 3H4z'
  },
  printer: {
    name: 'Принтер',
    color: '#475569',
    path: 'M6 3h12v5H6z M4 8h16v8H4z M7 16h10v5H7z M8 18h8 M8 13h1v1H8z'
  },
  accessPoint: {
    name: 'Точка доступа',
    color: '#0ea5e9',
    path: 'M8 14h8v6H8z M11 16h2v2h-2z M12 11a3 3 0 0 0-3 3 M12 11a3 3 0 0 1 3 3 M12 7a7 7 0 0 0-6 4 M12 7a7 7 0 0 1 6 4'
  },
  cloud: {
    name: 'Облако',
    color: '#64748b',
    path: 'M7 18h10a4 4 0 0 0 0-8 5 5 0 0 0-9.6-1.3A3.5 3.5 0 0 0 7 18z'
  },
  phone: {
    name: 'IP-телефон',
    color: '#9333ea',
    path: 'M7 3h10v18H7z M9 5h6v3H9z M9 10h1v1H9z M11.5 10h1v1h-1z M14 10h1v1h-1z M9 13h1v1H9z M11.5 13h1v1h-1z M14 13h1v1h-1z'
  },
  camera: {
    name: 'IP-камера',
    color: '#0d9488',
    path: 'M4 8h11v8H4z M15 10l5-3v10l-5-3 M7 12h.01 M4 19h11'
  },
  nas: {
    name: 'NAS-сервер',
    color: '#a16207',
    path: 'M5 3h14v18H5z M8 6v12 M11 6v12 M14 6v12 M16.5 7h1v1h-1z M16.5 10h1v1h-1z'
  },
  storage: {
    name: 'Хранилище',
    color: '#b45309',
    path: 'M5 6c0-1.5 3-2.5 7-2.5s7 1 7 2.5v12c0 1.5-3 2.5-7 2.5s-7-1-7-2.5z M5 6c0 1.5 3 2.5 7 2.5s7-1 7-2.5 M5 11c0 1.5 3 2.5 7 2.5s7-1 7-2.5'
  },
  unknown: {
    name: 'Устройство',
    color: '#6b7280',
    path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.7 M12 16h.01'
  }
}

export const DEVICE_TYPES = Object.keys(DEVICE_ICONS) as DeviceType[]

export function InlineIcon({
  type,
  size = 22,
  stroke
}: {
  type: DeviceType
  size?: number
  stroke?: string
}): JSX.Element {
  const def = DEVICE_ICONS[type]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d={def.path}
        stroke={stroke ?? def.color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

import type {
  ConfigChange,
  HardwareAsset,
  SoftwareLicense,
  TopologyNode,
  UpgradePlanItem
} from '../../../shared/types'
import { UPGRADE_PRIORITY_LABELS, UPGRADE_STATUS_LABELS } from './upgrade'

export interface CardSection {
  title: string
  rows: [string, string][]
  empty?: string
}

export interface AssetCardModel {
  kind: 'hardware' | 'software'
  title: string
  subtitle: string
  sections: CardSection[]
}

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v)

export function hardwareCard(
  a: HardwareAsset,
  ctx: {
    nodes: TopologyNode[]
    software: SoftwareLicense[]
    history: ConfigChange[]
    upgrade?: UpgradePlanItem
  }
): AssetCardModel {
  const linkedNodes = ctx.nodes.filter((n) => a.nodeId === n.id || n.assetId === a.id)
  const sections: CardSection[] = [
    {
      title: 'Общие сведения',
      rows: [
        ['Название', dash(a.name)],
        ['Тип', dash(a.type)],
        ['Производитель', dash(a.vendor)],
        ['Модель', dash(a.model)],
        ['Серийный №', dash(a.serial)],
        ['Статус', dash(a.status)],
        ['Расположение', dash(a.location)]
      ]
    },
    {
      title: 'Сеть',
      rows: [
        ['IP-адрес', dash(a.ip)],
        ['MAC-адрес', dash(a.mac)],
        ['Устройство на схеме', linkedNodes.length ? linkedNodes.map((n) => n.label).join(', ') : '—']
      ]
    },
    {
      title: 'Характеристики',
      rows: [
        ['CPU', dash(a.cpu)],
        ['ОЗУ, ГБ', dash(a.ramGb)],
        ['Диск, ГБ', dash(a.diskGb)],
        ['ОС', dash(a.os)]
      ]
    },
    {
      title: 'Закупка и гарантия',
      rows: [
        ['Дата покупки', dash(a.purchaseDate)],
        ['Гарантия до', dash(a.warrantyUntil)]
      ]
    }
  ]
  if (ctx.upgrade) {
    const u = ctx.upgrade
    sections.push({
      title: 'План апгрейда',
      rows: [
        ['Статус', UPGRADE_STATUS_LABELS[u.status]],
        ['Приоритет', UPGRADE_PRIORITY_LABELS[u.priority]],
        ['Причина', dash(u.reason)],
        ['Рекомендация', dash(u.recommendation)],
        ['Плановая дата', dash(u.plannedDate)],
        ['Бюджет', dash(u.budget)],
        ['Комментарий', dash(u.comment)]
      ]
    })
  }
  sections.push({
    title: 'Установленное ПО',
    rows: ctx.software.map((s) => [s.name, [s.version, s.expiryDate && `до ${s.expiryDate}`].filter(Boolean).join(', ') || '—']),
    empty: 'Нет привязанного ПО'
  })
  if (a.notes) sections.push({ title: 'Заметки', rows: [['', a.notes]] })
  sections.push({
    title: 'История изменений',
    rows: ctx.history.map((c) => [
      new Date(c.timestamp).toLocaleString(),
      c.details ? `${c.summary} (${c.details})` : c.summary
    ]),
    empty: 'История пуста'
  })
  return {
    kind: 'hardware',
    title: a.name,
    subtitle: ['Карточка оборудования', [a.vendor, a.model].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    sections
  }
}

export function softwareCard(s: SoftwareLicense, asset?: HardwareAsset): AssetCardModel {
  const sections: CardSection[] = [
    {
      title: 'Общие сведения',
      rows: [
        ['Название', dash(s.name)],
        ['Производитель', dash(s.vendor)],
        ['Версия', dash(s.version)]
      ]
    },
    {
      title: 'Лицензия',
      rows: [
        ['Лицензионный ключ', dash(s.licenseKey)],
        ['Активаций всего', s.seats === null ? '∞' : String(s.seats)],
        ['Использовано', dash(s.seatsUsed ?? 0)],
        ['Действует до', s.expiryDate || 'бессрочно']
      ]
    },
    {
      title: 'Установлено на',
      rows: [['Оборудование', asset ? asset.name : '—']]
    }
  ]
  if (s.notes) sections.push({ title: 'Заметки', rows: [['', s.notes]] })
  return {
    kind: 'software',
    title: s.name,
    subtitle: ['Карточка программы', s.version].filter(Boolean).join(' · '),
    sections
  }
}

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function cardToHtml(card: AssetCardModel): string {
  const body = card.sections
    .map((sec) => {
      const rows = sec.rows.length
        ? sec.rows
            .map(([k, v]) =>
              k ? `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>` : `<tr><td colspan="2">${esc(v)}</td></tr>`
            )
            .join('')
        : `<tr><td colspan="2" class="muted">${esc(sec.empty ?? '—')}</td></tr>`
      return `<h2>${esc(sec.title)}</h2><table>${rows}</table>`
    })
    .join('')
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>${esc(card.title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; font-size: 12px; margin: 0; }
  header { border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px; }
  h1 { font-size: 20px; margin: 0; }
  .sub { color: #64748b; margin-top: 2px; }
  h2 { font-size: 13px; margin: 14px 0 4px; color: #2563eb; text-transform: uppercase; letter-spacing: .03em; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; white-space: pre-wrap; }
  th { width: 34%; color: #475569; font-weight: 600; }
  .muted { color: #94a3b8; }
  footer { margin-top: 16px; color: #94a3b8; font-size: 10px; }
</style></head><body>
<header><h1>${esc(card.title)}</h1><div class="sub">${esc(card.subtitle)}</div></header>
${body}
<footer>Зигзаг Нуля · сформировано ${esc(new Date().toLocaleString())}</footer>
</body></html>`
}

export function printHtml(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) return
  doc.open()
  doc.write(html)
  doc.close()
  const win = iframe.contentWindow!
  win.focus()
  setTimeout(() => {
    win.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 250)
}

export function cardFileName(card: AssetCardModel): string {
  const base = card.title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'asset'
  return `${card.kind === 'hardware' ? 'оборудование' : 'ПО'}-${base}`
}

import { useStore } from '../store/useStore'
import { DEVICE_ICONS, DEVICE_TYPES } from '../lib/deviceIcons'
import { LINK_MEDIA, LINK_MEDIUM_TYPES, resolveLinkStyle } from '../lib/linkStyles'
import { assetsForNode, useInventory } from '../store/useInventory'
import type { DeviceType, LinkMedium, TopologyNode } from '../../../shared/types'

function LinkedAssets({ node }: { node: TopologyNode }): JSX.Element {
  const hardware = useInventory((s) => s.hardware)
  const refresh = useInventory((s) => s.refresh)
  const openCard = useStore((s) => s.openCard)
  const updateNode = useStore((s) => s.updateNode)
  const linked = assetsForNode(hardware, node)
  const free = hardware.filter((a) => !linked.includes(a))

  async function link(assetId: string): Promise<void> {
    await window.zigzag.inventory.upsertHardware({ id: assetId, nodeId: node.id })
    if (!node.assetId) updateNode(node.id, { assetId })
    await refresh()
  }

  async function unlink(assetId: string): Promise<void> {
    const a = hardware.find((x) => x.id === assetId)
    if (a?.nodeId === node.id) {
      await window.zigzag.inventory.upsertHardware({ id: assetId, nodeId: null })
    }
    if (node.assetId === assetId) updateNode(node.id, { assetId: undefined })
    await refresh()
  }

  return (
    <fieldset>
      <legend>Оборудование (инвентаризация)</legend>
      {linked.length === 0 && <div className="muted">Нет привязанного оборудования</div>}
      {linked.map((a) => (
        <div key={a.id} className="linked-asset">
          <div>
            <b>{a.name}</b>
            <div className="muted">
              {[a.vendor, a.model].filter(Boolean).join(' ') || a.type}
              {a.inventoryNumber ? ` · Инв. № ${a.inventoryNumber}` : ''}
              {a.serial ? ` · S/N ${a.serial}` : ''}
            </div>
          </div>
          <div className="linked-asset-actions">
            <button className="btn-link" onClick={() => openCard({ kind: 'hardware', id: a.id })}>
              Карточка
            </button>
            <button className="btn-link" onClick={() => unlink(a.id)} title="Отвязать">
              ✕
            </button>
          </div>
        </div>
      ))}
      {free.length > 0 && (
        <label>
          Привязать
          <select value="" onChange={(e) => e.target.value && link(e.target.value)}>
            <option value="">— выберите единицу —</option>
            {free.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.model ? ` (${a.model})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  )
}

export default function Inspector(): JSX.Element {
  const selection = useStore((s) => s.selection)
  const project = useStore((s) => s.project)
  const updateNode = useStore((s) => s.updateNode)
  const updateZone = useStore((s) => s.updateZone)
  const updateLabel = useStore((s) => s.updateLabel)
  const updateLink = useStore((s) => s.updateLink)
  const deleteSelection = useStore((s) => s.deleteSelection)

  if (!selection) {
    return (
      <aside className="inspector">
        <div className="inspector-empty">
          Выберите элемент на схеме, чтобы изменить его свойства, или добавьте новый из палитры слева.
        </div>
      </aside>
    )
  }

  if (selection.kind === 'node') {
    const node = project.nodes.find((n) => n.id === selection.id)
    if (!node) return <aside className="inspector" />
    return (
      <aside className="inspector">
        <h3>Устройство</h3>
        <label>Название
          <input value={node.label} onChange={(e) => updateNode(node.id, { label: e.target.value })} />
        </label>
        <label>Тип
          <select value={node.type} onChange={(e) => updateNode(node.id, { type: e.target.value as DeviceType })}>
            {DEVICE_TYPES.map((t) => (
              <option key={t} value={t}>{DEVICE_ICONS[t].name}</option>
            ))}
          </select>
        </label>
        <label>IP-адрес
          <input value={node.ip ?? ''} onChange={(e) => updateNode(node.id, { ip: e.target.value })} placeholder="192.168.1.10" />
        </label>
        <label>MAC
          <input value={node.mac ?? ''} onChange={(e) => updateNode(node.id, { mac: e.target.value })} placeholder="00:11:22:..." />
        </label>

        <LinkedAssets node={node} />

        <fieldset>
          <legend>
            <label className="inline">
              <input type="checkbox" checked={node.ping.enabled}
                onChange={(e) => updateNode(node.id, { ping: { ...node.ping, enabled: e.target.checked, ip: node.ping.ip || node.ip || '' } })} />
              Пинг-мониторинг (ICMP)
            </label>
          </legend>
          <label>IP для пинга
            <input value={node.ping.ip} onChange={(e) => updateNode(node.id, { ping: { ...node.ping, ip: e.target.value } })} placeholder="192.168.1.10" />
          </label>
          <label>Интервал опроса (мс)
            <input type="number" min={1000} step={500} value={node.ping.intervalMs}
              onChange={(e) => updateNode(node.id, { ping: { ...node.ping, intervalMs: Number(e.target.value) } })} />
          </label>
        </fieldset>

        <fieldset>
          <legend>
            <label className="inline">
              <input type="checkbox" checked={node.web.enabled}
                onChange={(e) => updateNode(node.id, { web: { ...node.web, enabled: e.target.checked } })} />
              Web-интеграция
            </label>
          </legend>
          <label>Ссылка
            <input value={node.web.url} onChange={(e) => updateNode(node.id, { web: { ...node.web, url: e.target.value } })} placeholder="https://192.168.1.10" />
          </label>
          {node.web.enabled && node.web.url && (
            <button className="btn-link" onClick={() => window.zigzag.shell.openExternal(node.web.url)}>
              Открыть в браузере
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend>
            <label className="inline">
              <input type="checkbox" checked={node.note.enabled}
                onChange={(e) => updateNode(node.id, { note: { ...node.note, enabled: e.target.checked } })} />
              Заметка
            </label>
          </legend>
          <textarea rows={4} value={node.note.text}
            onChange={(e) => updateNode(node.id, { note: { ...node.note, text: e.target.value } })}
            placeholder="Текст заметки..." />
        </fieldset>

        <fieldset>
          <legend>
            <label className="inline">
              <input type="checkbox" checked={node.snmp.enabled}
                onChange={(e) => updateNode(node.id, { snmp: { ...node.snmp, enabled: e.target.checked } })} />
              SNMP
            </label>
          </legend>
          <label>Community
            <input value={node.snmp.community} onChange={(e) => updateNode(node.id, { snmp: { ...node.snmp, community: e.target.value } })} />
          </label>
          <label>Версия
            <select value={node.snmp.version} onChange={(e) => updateNode(node.id, { snmp: { ...node.snmp, version: e.target.value as '1' | '2c' } })}>
              <option value="1">v1</option>
              <option value="2c">v2c</option>
            </select>
          </label>
        </fieldset>

        <button className="btn-danger" onClick={deleteSelection}>Удалить устройство</button>
      </aside>
    )
  }

  if (selection.kind === 'zone') {
    const z = project.zones.find((x) => x.id === selection.id)
    if (!z) return <aside className="inspector" />
    return (
      <aside className="inspector">
        <h3>Зона</h3>
        <label>Подпись
          <input value={z.label} onChange={(e) => updateZone(z.id, { label: e.target.value })} />
        </label>
        <label>Цвет заливки
          <input type="color" value={z.fill} onChange={(e) => updateZone(z.id, { fill: e.target.value })} />
        </label>
        <label>Прозрачность: {Math.round(z.opacity * 100)}%
          <input type="range" min={0.05} max={0.8} step={0.05} value={z.opacity}
            onChange={(e) => updateZone(z.id, { opacity: Number(e.target.value) })} />
        </label>
        <label>Текстура
          <select value={z.pattern} onChange={(e) => updateZone(z.id, { pattern: e.target.value as 'solid' | 'hatch' | 'dots' })}>
            <option value="solid">Сплошная</option>
            <option value="hatch">Штриховка</option>
            <option value="dots">Точки</option>
          </select>
        </label>
        <button className="btn-danger" onClick={deleteSelection}>Удалить зону</button>
      </aside>
    )
  }

  if (selection.kind === 'label') {
    const l = project.labels.find((x) => x.id === selection.id)
    if (!l) return <aside className="inspector" />
    return (
      <aside className="inspector">
        <h3>Надпись</h3>
        <label>Текст
          <input value={l.text} onChange={(e) => updateLabel(l.id, { text: e.target.value })} />
        </label>
        <label>Размер шрифта
          <input type="number" min={8} max={72} value={l.fontSize} onChange={(e) => updateLabel(l.id, { fontSize: Number(e.target.value) })} />
        </label>
        <label>Цвет
          <input type="color" value={l.color} onChange={(e) => updateLabel(l.id, { color: e.target.value })} />
        </label>
        <button className="btn-danger" onClick={deleteSelection}>Удалить надпись</button>
      </aside>
    )
  }

  // link
  const l = project.links.find((x) => x.id === selection.id)
  if (!l) return <aside className="inspector" />
  return (
    <aside className="inspector">
      <h3>Связь</h3>
      <div className="muted">Источник: {l.source}</div>
      <label>Подпись
        <input value={l.label ?? ''} onChange={(e) => updateLink(l.id, { label: e.target.value })} placeholder="напр. Gi0/1" />
      </label>
      <label>Тип канала
        <select value={l.medium ?? 'ethernet'} onChange={(e) => updateLink(l.id, { medium: e.target.value as LinkMedium })}>
          {LINK_MEDIUM_TYPES.map((m) => (
            <option key={m} value={m}>{LINK_MEDIA[m].name}</option>
          ))}
        </select>
      </label>
      <label>Цвет
        <input type="color" value={resolveLinkStyle(l).color} onChange={(e) => updateLink(l.id, { color: e.target.value })} />
      </label>
      {l.color && (
        <button className="btn-link" onClick={() => updateLink(l.id, { color: undefined })}>
          Сбросить цвет (по типу канала)
        </button>
      )}
      <label className="inline">
        <input type="checkbox" checked={!!l.dashed} onChange={(e) => updateLink(l.id, { dashed: e.target.checked })} />
        Пунктир
      </label>
      <button className="btn-danger" onClick={deleteSelection}>Удалить связь</button>
    </aside>
  )
}

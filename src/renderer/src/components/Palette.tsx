import { useStore } from '../store/useStore'
import { DEVICE_ICONS, DEVICE_TYPES, InlineIcon } from '../lib/deviceIcons'
import { LINK_MEDIA, LINK_MEDIUM_TYPES } from '../lib/linkStyles'

export default function Palette(): JSX.Element {
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const linkMedium = useStore((s) => s.linkMedium)
  const setLinkMedium = useStore((s) => s.setLinkMedium)

  const isPlacing = (t: string): boolean =>
    tool.kind === 'placeDevice' && tool.deviceType === t

  return (
    <aside className="palette">
      <div className="palette-section">Инструменты</div>
      <button
        className={tool.kind === 'select' ? 'palette-tool active' : 'palette-tool'}
        onClick={() => setTool({ kind: 'select' })}
      >
        ↖ Выбор
      </button>
      <button
        className={tool.kind === 'addLink' ? 'palette-tool active' : 'palette-tool'}
        onClick={() => setTool({ kind: 'addLink' })}
        title="Соедините два устройства"
      >
        ／ Связь
      </button>
      <label className="palette-field" title="Тип канала для новых связей">
        Канал
        <select
          value={linkMedium}
          onChange={(e) => {
            setLinkMedium(e.target.value as typeof linkMedium)
            setTool({ kind: 'addLink' })
          }}
        >
          {LINK_MEDIUM_TYPES.map((m) => (
            <option key={m} value={m}>
              {LINK_MEDIA[m].name}
            </option>
          ))}
        </select>
      </label>
      <button
        className={tool.kind === 'addZone' ? 'palette-tool active' : 'palette-tool'}
        onClick={() => setTool({ kind: 'addZone' })}
        title="Нарисуйте область"
      >
        ▭ Зона
      </button>
      <button
        className={tool.kind === 'addText' ? 'palette-tool active' : 'palette-tool'}
        onClick={() => setTool({ kind: 'addText' })}
      >
        T Надпись
      </button>

      <div className="palette-section">Библиотека устройств</div>
      <div className="palette-icons">
        {DEVICE_TYPES.map((t) => (
          <button
            key={t}
            className={isPlacing(t) ? 'palette-icon active' : 'palette-icon'}
            title={DEVICE_ICONS[t].name}
            onClick={() => setTool({ kind: 'placeDevice', deviceType: t })}
          >
            <InlineIcon type={t} size={26} />
            <span>{DEVICE_ICONS[t].name}</span>
          </button>
        ))}
      </div>

      <div className="palette-hint">
        {tool.kind === 'placeDevice' && 'Кликните на схеме, чтобы разместить'}
        {tool.kind === 'addLink' && 'Кликните два устройства'}
        {tool.kind === 'addZone' && 'Зажмите и протяните'}
        {tool.kind === 'addText' && 'Кликните на схеме'}
      </div>
    </aside>
  )
}

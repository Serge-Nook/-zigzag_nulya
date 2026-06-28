import { useStore } from '../store/useStore'
import { useMonitor } from '../store/useMonitor'
import {
  exportProjectPdf,
  exportProjectPng,
  exportProjectSvg,
  printProject
} from '../lib/exporter'

interface Props {
  onOpenSettings: () => void
}

export default function TopBar({ onOpenSettings }: Props): JSX.Element {
  const project = useStore((s) => s.project)
  const filePath = useStore((s) => s.filePath)
  const dirty = useStore((s) => s.dirty)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const gridVisible = useStore((s) => s.gridVisible)
  const toggleGrid = useStore((s) => s.toggleGrid)
  const newProject = useStore((s) => s.newProject)
  const loadProject = useStore((s) => s.loadProject)
  const setFilePath = useStore((s) => s.setFilePath)
  const markSaved = useStore((s) => s.markSaved)
  const setProjectName = useStore((s) => s.setProjectName)

  const alarmActive = useMonitor((s) => s.alarmActive)
  const muted = useMonitor((s) => s.muted)
  const toggleMute = useMonitor((s) => s.toggleMute)

  async function handleOpen(): Promise<void> {
    const res = await window.zigzag.project.open()
    if (res.error) return alert('Ошибка: ' + res.error)
    if (!res.canceled && res.project) loadProject(res.project, res.path)
  }

  async function handleSave(saveAs = false): Promise<void> {
    const res = saveAs
      ? await window.zigzag.project.saveAs(project)
      : await window.zigzag.project.save(project, filePath)
    if (res.error) return alert('Ошибка: ' + res.error)
    if (!res.canceled && res.path) {
      setFilePath(res.path)
      markSaved()
    }
  }

  const tabs: { id: typeof view; label: string }[] = [
    { id: 'topology', label: 'Топология' },
    { id: 'discovery', label: 'Сканирование' },
    { id: 'inventory', label: 'Инвентаризация' },
    { id: 'traps', label: 'SNMP-ловушки' }
  ]

  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">Z</span>
        <span>Зигзаг&nbsp;Нуля</span>
      </div>

      <div className="topbar-group">
        <button onClick={newProject} title="Новый проект">Новый</button>
        <button onClick={handleOpen} title="Открыть .zigzag">Открыть</button>
        <button onClick={() => handleSave(false)} title="Сохранить">
          Сохранить{dirty ? ' *' : ''}
        </button>
        <button onClick={() => handleSave(true)}>Сохранить как…</button>
      </div>

      <input
        className="project-name"
        value={project.meta.name}
        onChange={(e) => setProjectName(e.target.value)}
        title="Название проекта"
      />

      <div className="topbar-group">
        <button onClick={() => exportProjectPng(project)}>PNG</button>
        <button onClick={() => exportProjectSvg(project)}>SVG</button>
        <button onClick={() => exportProjectPdf(project)}>PDF</button>
        <button onClick={() => printProject(project)}>Печать</button>
      </div>

      <div className="topbar-group">
        <button className={gridVisible ? 'active' : ''} onClick={toggleGrid}>Сетка</button>
        <button onClick={onOpenSettings}>Настройки</button>
        <button
          className={alarmActive ? (muted ? 'alarm-muted' : 'alarm-on') : ''}
          onClick={toggleMute}
          title="Звук тревоги"
        >
          {muted ? '🔇' : '🔔'} {alarmActive ? 'ТРЕВОГА' : ''}
        </button>
      </div>

      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={view === t.id ? 'tab active' : 'tab'} onClick={() => setView(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  )
}

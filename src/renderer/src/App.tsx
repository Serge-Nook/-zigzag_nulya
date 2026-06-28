import { useEffect, useRef, useState } from 'react'
import type Konva from 'konva'
import { useStore } from './store/useStore'
import { useMonitorController } from './lib/useMonitorController'
import TopBar from './components/TopBar'
import Palette from './components/Palette'
import TopologyCanvas from './components/TopologyCanvas'
import Inspector from './components/Inspector'
import DiscoveryPanel from './components/DiscoveryPanel'
import InventoryView from './components/InventoryView'
import TrapsPanel from './components/TrapsPanel'
import NoteModal from './components/NoteModal'
import SettingsModal from './components/SettingsModal'

export default function App(): JSX.Element {
  useMonitorController()
  const view = useStore((s) => s.view)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const stageRef = useRef<Konva.Stage | null>(null)
  const [noteNodeId, setNoteNodeId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if (!typing && (e.key === 'Delete' || e.key === 'Backspace')) {
        deleteSelection()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteSelection])

  return (
    <div className="app">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <main className="main">
        {view === 'topology' && (
          <div className="topology-layout">
            <Palette />
            <TopologyCanvas stageRef={stageRef} onOpenNote={(id) => setNoteNodeId(id)} />
            <Inspector />
          </div>
        )}
        {view === 'discovery' && <DiscoveryPanel />}
        {view === 'inventory' && <InventoryView />}
        {view === 'traps' && <TrapsPanel />}
      </main>

      {noteNodeId && <NoteModal nodeId={noteNodeId} onClose={() => setNoteNodeId(null)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

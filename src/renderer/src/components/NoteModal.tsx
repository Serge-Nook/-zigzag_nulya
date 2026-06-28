import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

interface Props {
  nodeId: string
  onClose: () => void
}

export default function NoteModal({ nodeId, onClose }: Props): JSX.Element | null {
  const node = useStore((s) => s.project.nodes.find((n) => n.id === nodeId))
  const updateNode = useStore((s) => s.updateNode)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(node?.note.text ?? '')

  useEffect(() => {
    setText(node?.note.text ?? '')
  }, [node?.note.text])

  if (!node) return null

  function saveAndClose(): void {
    updateNode(nodeId, { note: { ...node!.note, text, enabled: true } })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Заметка — {node.label}</h3>
        {editing ? (
          <textarea autoFocus rows={8} value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <div className="note-view">{text || <span className="muted">Заметка пуста</span>}</div>
        )}
        <div className="modal-actions">
          {!editing && <button onClick={() => setEditing(true)}>Редактировать</button>}
          <button className="btn-primary" onClick={saveAndClose}>
            Сохранить и закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Text, Group, Transformer } from 'react-konva'
import type Konva from 'konva'
import { v4 as uuid } from 'uuid'
import { useStore } from '../store/useStore'
import { makeNode } from '../store/useStore'
import DeviceNode from './DeviceNode'
import type { Zone } from '../../../shared/types'

interface Props {
  stageRef: React.MutableRefObject<Konva.Stage | null>
  onOpenNote: (nodeId: string) => void
}

export default function TopologyCanvas({ stageRef, onOpenNote }: Props): JSX.Element {
  const project = useStore((s) => s.project)
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const linkSource = useStore((s) => s.linkSource)
  const setLinkSource = useStore((s) => s.setLinkSource)
  const gridVisible = useStore((s) => s.gridVisible)
  const addNode = useStore((s) => s.addNode)
  const moveNode = useStore((s) => s.moveNode)
  const addLink = useStore((s) => s.addLink)
  const addZone = useStore((s) => s.addZone)
  const updateZone = useStore((s) => s.updateZone)
  const addLabel = useStore((s) => s.addLabel)

  const containerRef = useRef<HTMLDivElement>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const zoneRefs = useRef<Record<string, Konva.Rect>>({})
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(1)
  const [draft, setDraft] = useState<Zone | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }))
    ro.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Attach transformer to selected zone.
  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    if (selection?.kind === 'zone' && zoneRefs.current[selection.id]) {
      tr.nodes([zoneRefs.current[selection.id]])
    } else {
      tr.nodes([])
    }
    tr.getLayer()?.batchDraw()
  }, [selection, project.zones])

  const nodeById = new Map(project.nodes.map((n) => [n.id, n]))

  function relPointer(): { x: number; y: number } {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    return stage.getRelativePointerPosition() ?? { x: 0, y: 0 }
  }

  function handleNodeClick(id: string): void {
    if (tool.kind === 'addLink') {
      if (!linkSource) {
        setLinkSource(id)
      } else {
        addLink(linkSource, id)
        setLinkSource(undefined)
        setTool({ kind: 'select' })
      }
      return
    }
    select({ kind: 'node', id })
  }

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>): void {
    const clickedEmpty = e.target === e.target.getStage()
    if (tool.kind === 'addZone' && clickedEmpty) {
      const p = relPointer()
      setDraft({
        id: uuid(),
        x: p.x,
        y: p.y,
        width: 1,
        height: 1,
        label: 'Зона',
        fill: '#3b82f6',
        opacity: 0.15,
        pattern: 'solid'
      })
      return
    }
    if (clickedEmpty && tool.kind === 'select') select(undefined)
  }

  function handleStageMouseMove(): void {
    if (!draft) return
    const p = relPointer()
    setDraft({ ...draft, width: p.x - draft.x, height: p.y - draft.y })
  }

  function handleStageMouseUp(): void {
    if (draft) {
      const norm: Zone = {
        ...draft,
        x: draft.width < 0 ? draft.x + draft.width : draft.x,
        y: draft.height < 0 ? draft.y + draft.height : draft.y,
        width: Math.max(40, Math.abs(draft.width)),
        height: Math.max(30, Math.abs(draft.height))
      }
      addZone(norm)
      setDraft(null)
      select({ kind: 'zone', id: norm.id })
      setTool({ kind: 'select' })
    }
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>): void {
    const clickedEmpty = e.target === e.target.getStage()
    if (!clickedEmpty) return
    const p = relPointer()
    if (tool.kind === 'placeDevice') {
      const n = makeNode(tool.deviceType, p.x, p.y)
      addNode(n)
      select({ kind: 'node', id: n.id })
      setTool({ kind: 'select' })
    } else if (tool.kind === 'addText') {
      const text = window.prompt('Текст надписи:', 'Надпись')
      if (text) {
        const l = { id: uuid(), x: p.x, y: p.y, text, fontSize: 16, color: '#0f172a' }
        addLabel(l)
        select({ kind: 'label', id: l.id })
      }
      setTool({ kind: 'select' })
    }
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>): void {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale
    }
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(3, Math.max(0.25, oldScale * (direction > 0 ? 1.1 : 1 / 1.1)))
    stage.scale({ x: newScale, y: newScale })
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale
    })
    setScale(newScale)
  }

  const gridLines: JSX.Element[] = []
  if (gridVisible) {
    const step = 40
    const extent = 4000
    for (let i = -extent; i <= extent; i += step) {
      gridLines.push(
        <Line key={`v${i}`} points={[i, -extent, i, extent]} stroke="#e2e8f0" strokeWidth={1} listening={false} />
      )
      gridLines.push(
        <Line key={`h${i}`} points={[-extent, i, extent, i]} stroke="#e2e8f0" strokeWidth={1} listening={false} />
      )
    }
  }

  const cursor =
    tool.kind === 'select' ? 'default' : tool.kind === 'addLink' ? 'crosshair' : 'copy'

  return (
    <div ref={containerRef} className="canvas-wrap" style={{ cursor }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        draggable={tool.kind === 'select'}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        style={{ background: '#f8fafc' }}
      >
        <Layer listening={false}>{gridLines}</Layer>

        {/* Zones */}
        <Layer>
          {project.zones.map((z) => (
            <Group key={z.id}>
              <Rect
                ref={(node) => {
                  if (node) zoneRefs.current[z.id] = node
                }}
                x={z.x}
                y={z.y}
                width={z.width}
                height={z.height}
                cornerRadius={8}
                fill={z.fill}
                opacity={z.opacity}
                stroke={z.fill}
                strokeWidth={selection?.kind === 'zone' && selection.id === z.id ? 2 : 1}
                draggable={tool.kind === 'select'}
                onClick={(e) => {
                  e.cancelBubble = true
                  select({ kind: 'zone', id: z.id })
                }}
                onDragEnd={(e) => updateZone(z.id, { x: e.target.x(), y: e.target.y() })}
                onTransformEnd={(e) => {
                  const node = e.target as Konva.Rect
                  const sx = node.scaleX()
                  const sy = node.scaleY()
                  node.scaleX(1)
                  node.scaleY(1)
                  updateZone(z.id, {
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(40, node.width() * sx),
                    height: Math.max(30, node.height() * sy)
                  })
                }}
              />
              <Text
                text={z.label}
                x={z.x + 8}
                y={z.y + 6}
                fontSize={13}
                fontStyle="bold"
                fill="#334155"
                listening={false}
              />
            </Group>
          ))}
          {draft && (
            <Rect
              x={draft.x}
              y={draft.y}
              width={draft.width}
              height={draft.height}
              fill={draft.fill}
              opacity={0.2}
              stroke={draft.fill}
              dash={[6, 4]}
            />
          )}
          <Transformer ref={trRef} rotateEnabled={false} />
        </Layer>

        {/* Links */}
        <Layer>
          {project.links.map((l) => {
            const a = nodeById.get(l.fromNodeId)
            const b = nodeById.get(l.toNodeId)
            if (!a || !b) return null
            const isSel = selection?.kind === 'link' && selection.id === l.id
            const color = l.color ?? (l.source === 'manual' ? '#64748b' : '#2563eb')
            return (
              <Group key={l.id}>
                <Line
                  points={[a.x, a.y, b.x, b.y]}
                  stroke={isSel ? '#f97316' : color}
                  strokeWidth={isSel ? 4 : 2}
                  dash={l.dashed || l.source === 'traceroute' ? [6, 4] : undefined}
                  hitStrokeWidth={14}
                  onClick={(e) => {
                    e.cancelBubble = true
                    select({ kind: 'link', id: l.id })
                  }}
                />
                {l.label && (
                  <Text
                    text={l.label}
                    x={(a.x + b.x) / 2 - 40}
                    y={(a.y + b.y) / 2 - 16}
                    width={80}
                    align="center"
                    fontSize={11}
                    fill="#475569"
                    listening={false}
                  />
                )}
              </Group>
            )
          })}
        </Layer>

        {/* Nodes */}
        <Layer>
          {project.nodes.map((n) => (
            <DeviceNode
              key={n.id}
              node={n}
              selected={selection?.kind === 'node' && selection.id === n.id}
              linkArmed={linkSource === n.id}
              onSelect={() => handleNodeClick(n.id)}
              onMove={(x, y) => moveNode(n.id, x, y)}
              onOpenNote={() => onOpenNote(n.id)}
              onOpenWeb={() => {
                if (n.web.url) window.zigzag.shell.openExternal(n.web.url)
              }}
            />
          ))}
        </Layer>

        {/* Free labels */}
        <Layer>
          {project.labels.map((t) => (
            <Text
              key={t.id}
              text={t.text}
              x={t.x}
              y={t.y}
              fontSize={t.fontSize}
              fill={t.color}
              draggable={tool.kind === 'select'}
              onClick={(e) => {
                e.cancelBubble = true
                select({ kind: 'label', id: t.id })
              }}
              onDragEnd={(e) => useStore.getState().updateLabel(t.id, { x: e.target.x(), y: e.target.y() })}
            />
          ))}
        </Layer>
      </Stage>

      <div className="zoom-indicator">{Math.round(scale * 100)}%</div>
    </div>
  )
}

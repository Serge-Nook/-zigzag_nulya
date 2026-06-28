import { useEffect, useState } from 'react'
import { Group, Rect, Path, Text, Circle } from 'react-konva'
import type Konva from 'konva'
import type { TopologyNode } from '../../../shared/types'
import { DEVICE_ICONS } from '../lib/deviceIcons'
import { useMonitor } from '../store/useMonitor'

export const NODE_W = 72
export const NODE_H = 72

interface Props {
  node: TopologyNode
  selected: boolean
  linkArmed: boolean
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onOpenNote: () => void
  onOpenWeb: () => void
}

export default function DeviceNode({
  node,
  selected,
  linkArmed,
  onSelect,
  onMove,
  onOpenNote,
  onOpenWeb
}: Props): JSX.Element {
  const def = DEVICE_ICONS[node.type]
  const status = useMonitor((s) => s.statuses[node.id])
  const [blinkOn, setBlinkOn] = useState(true)

  const down = status?.state === 'down'
  useEffect(() => {
    if (!down) {
      setBlinkOn(true)
      return
    }
    const t = window.setInterval(() => setBlinkOn((v) => !v), 450)
    return () => window.clearInterval(t)
  }, [down])

  const statusColor =
    status?.state === 'up' ? '#22c55e' : status?.state === 'down' ? '#ef4444' : '#94a3b8'

  return (
    <Group
      x={node.x}
      y={node.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => onMove(e.target.x(), e.target.y())}
    >
      <Rect
        x={-NODE_W / 2}
        y={-NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        cornerRadius={12}
        fill="#ffffff"
        stroke={selected ? '#f97316' : linkArmed ? '#22c55e' : def.color}
        strokeWidth={selected || linkArmed ? 3 : 2}
        shadowColor="#0f172a"
        shadowBlur={selected ? 10 : 4}
        shadowOpacity={0.18}
      />
      <Path
        data={def.path}
        x={-20}
        y={-26}
        scaleX={40 / 24}
        scaleY={40 / 24}
        stroke={def.color}
        strokeWidth={1.6}
        listening={false}
      />
      <Text
        text={node.label}
        x={-NODE_W}
        y={NODE_H / 2 + 6}
        width={NODE_W * 2}
        align="center"
        fontSize={12}
        fill="#0f172a"
        listening={false}
      />
      {node.ip && (
        <Text
          text={node.ip}
          x={-NODE_W}
          y={NODE_H / 2 + 22}
          width={NODE_W * 2}
          align="center"
          fontSize={10}
          fill="#64748b"
          listening={false}
        />
      )}

      {node.ping.enabled && (
        <Circle
          x={NODE_W / 2 - 8}
          y={-NODE_H / 2 + 8}
          radius={6}
          fill={statusColor}
          opacity={down && !blinkOn ? 0.15 : 1}
          stroke="#ffffff"
          strokeWidth={1.5}
          listening={false}
        />
      )}

      {node.web.enabled && (
        <Group
          x={-NODE_W / 2 + 4}
          y={-NODE_H / 2 + 4}
          onClick={(e) => {
            e.cancelBubble = true
            onOpenWeb()
          }}
          onTap={(e) => {
            e.cancelBubble = true
            onOpenWeb()
          }}
        >
          <Circle radius={9} fill="#0ea5e9" />
          <Text text="🌐" x={-8} y={-7} fontSize={12} />
        </Group>
      )}

      {node.note.enabled && (
        <Group
          x={-NODE_W / 2 + 4}
          y={NODE_H / 2 - 4}
          onClick={(e) => {
            e.cancelBubble = true
            onOpenNote()
          }}
          onTap={(e) => {
            e.cancelBubble = true
            onOpenNote()
          }}
        >
          <Circle radius={9} fill="#f59e0b" />
          <Text text="✏️" x={-8} y={-7} fontSize={11} />
        </Group>
      )}
    </Group>
  )
}

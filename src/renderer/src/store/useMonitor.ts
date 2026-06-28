import { create } from 'zustand'

export type PingState = 'up' | 'down' | 'unknown'

export interface NodeStatus {
  state: PingState
  lastMs?: number
  ts: number
}

interface MonitorState {
  statuses: Record<string, NodeStatus>
  alarmActive: boolean
  muted: boolean
  setStatus: (nodeId: string, status: NodeStatus) => void
  clearStatus: (nodeId: string) => void
  setAlarmActive: (active: boolean) => void
  toggleMute: () => void
}

export const useMonitor = create<MonitorState>((set) => ({
  statuses: {},
  alarmActive: false,
  muted: false,
  setStatus: (nodeId, status) =>
    set((s) => ({ statuses: { ...s.statuses, [nodeId]: status } })),
  clearStatus: (nodeId) =>
    set((s) => {
      const next = { ...s.statuses }
      delete next[nodeId]
      return { statuses: next }
    }),
  setAlarmActive: (active) => set({ alarmActive: active }),
  toggleMute: () => set((s) => ({ muted: !s.muted }))
}))

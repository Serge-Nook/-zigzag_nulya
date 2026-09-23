import type { UpgradePriority, UpgradeStatus } from '../../../shared/types'

export const UPGRADE_STATUS_LABELS: Record<UpgradeStatus, string> = {
  proposed: 'Предложено',
  planned: 'Запланировано',
  inProgress: 'В работе',
  done: 'Выполнено',
  rejected: 'Отклонено'
}

export const UPGRADE_PRIORITY_LABELS: Record<UpgradePriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий'
}

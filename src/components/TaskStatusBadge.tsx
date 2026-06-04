import { Badge } from '@/components/ui/badge'
import { TaskStatus } from '@/types/database'
import { getTaskStatusColor } from '@/lib/utils'

const labels: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Hecho',
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={getTaskStatusColor(status)}>
      {labels[status]}
    </Badge>
  )
}

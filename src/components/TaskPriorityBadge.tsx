import { Badge } from '@/components/ui/badge'
import { TaskPriority } from '@/types/database'
import { getTaskPriorityColor } from '@/lib/utils'

const labels: Record<TaskPriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={getTaskPriorityColor(priority)}>
      {labels[priority]}
    </Badge>
  )
}

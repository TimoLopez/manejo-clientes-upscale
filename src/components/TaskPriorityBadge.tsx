import { TaskPriority } from '@/types/database'

const config: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  high:   { label: 'Alta',  color: '#f87171', bg: 'rgba(248,113,113,0.14)' },
  medium: { label: 'Media', color: '#fb923c', bg: 'rgba(251,146,60,0.14)'  },
  low:    { label: 'Baja',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const c = config[priority]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border"
      style={{ color: c.color, background: c.bg, borderColor: `${c.color}28` }}
    >
      {c.label}
    </span>
  )
}

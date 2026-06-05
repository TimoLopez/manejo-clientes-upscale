import { TaskStatus } from '@/types/database'

const config: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
  in_progress: { label: 'En progreso', color: '#60a5fa', bg: 'rgba(96,165,250,0.14)'  },
  done:        { label: 'Hecho',       color: '#34d399', bg: 'rgba(52,211,153,0.14)'  },
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const c = config[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border"
      style={{ color: c.color, background: c.bg, borderColor: `${c.color}28` }}
    >
      {c.label}
    </span>
  )
}

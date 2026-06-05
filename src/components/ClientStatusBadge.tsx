import { ClientStatus } from '@/types/database'

const config: Record<ClientStatus, { label: string; color: string; bg: string; shadow: string }> = {
  lead:     { label: 'Lead',       color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  shadow: '0 0 8px rgba(96,165,250,0.25)' },
  active:   { label: 'Activo',     color: '#34d399', bg: 'rgba(52,211,153,0.12)',  shadow: '0 0 8px rgba(52,211,153,0.25)' },
  paused:   { label: 'Pausado',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  shadow: '0 0 8px rgba(251,191,36,0.25)' },
  finished: { label: 'Finalizado', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', shadow: 'none' },
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const c = config[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{
        color: c.color,
        background: c.bg,
        borderColor: `${c.color}30`,
        boxShadow: c.shadow,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  )
}

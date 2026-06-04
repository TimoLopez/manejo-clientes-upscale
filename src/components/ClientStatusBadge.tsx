import { Badge } from '@/components/ui/badge'
import { ClientStatus } from '@/types/database'
import { getClientStatusColor } from '@/lib/utils'

const labels: Record<ClientStatus, string> = {
  lead: 'Lead',
  active: 'Activo',
  paused: 'Pausado',
  finished: 'Finalizado',
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge variant="outline" className={getClientStatusColor(status)}>
      {labels[status]}
    </Badge>
  )
}

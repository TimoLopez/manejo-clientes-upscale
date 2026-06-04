'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Client, ClientStatus, Task } from '@/types/database'
import { ClientStatusBadge } from '@/components/ClientStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClientForm } from '@/components/ClientForm'
import { formatDate, isOverdue } from '@/lib/utils'
import { Users, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react'

const STATUS_OPTIONS: { value: ClientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'finished', label: 'Finalizado' },
]

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<ClientStatus | 'all'>('all')
  const [showNewClient, setShowNewClient] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*'),
    ])
    setClients(c ?? [])
    setTasks(t ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? clients : clients.filter(c => c.status === filter)
  const activeClients = clients.filter(c => c.status === 'active').length
  const pendingTasks = tasks.filter(t => t.status !== 'done').length
  const overdueTasks = tasks.filter(t => t.status !== 'done' && isOverdue(t.due_date)).length

  function getClientPendingCount(clientId: string) {
    return tasks.filter(t => t.client_id === clientId && t.status !== 'done').length
  }

  function getClientNextDue(clientId: string): string | null {
    const upcoming = tasks
      .filter(t => t.client_id === clientId && t.status !== 'done' && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    return upcoming[0]?.due_date ?? null
  }

  return (
    <>
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-slate-500" />
                <div>
                  <p className="text-2xl font-bold">{clients.length}</p>
                  <p className="text-sm text-slate-500">Total clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{activeClients}</p>
                  <p className="text-sm text-slate-500">Clientes activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingTasks}</p>
                  <p className="text-sm text-slate-500">Tareas pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{overdueTasks}</p>
                  <p className="text-sm text-slate-500">Vencidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Clientes</CardTitle>
            <Button onClick={() => setShowNewClient(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nuevo cliente
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filter === opt.value
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-slate-400 text-sm py-8 text-center">Cargando...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay clientes aún</p>
                <p className="text-sm mt-1">Crea tu primer cliente con el botón de arriba</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(client => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-md transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                          {client.name}
                        </p>
                        <p className="text-sm text-slate-500">{client.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <ClientStatusBadge status={client.status} />
                      <span className="hidden sm:block">
                        {getClientPendingCount(client.id)} tarea(s) pendiente(s)
                      </span>
                      <span className="hidden md:block text-xs">
                        Próx: {formatDate(getClientNextDue(client.id))}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <ClientForm onSuccess={() => { setShowNewClient(false); load() }} onCancel={() => setShowNewClient(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

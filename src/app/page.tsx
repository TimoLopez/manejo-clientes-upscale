'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Client, ClientStatus, Task } from '@/types/database'
import { ClientStatusBadge } from '@/components/ClientStatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClientForm } from '@/components/ClientForm'
import { formatDate, isOverdue } from '@/lib/utils'
import { Users, CheckCircle, Clock, AlertCircle, Plus, ChevronRight, Trash2, AlertTriangle } from 'lucide-react'

const STATUS_OPTIONS: { value: ClientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'finished', label: 'Finalizado' },
]

function useCountUp(target: number, delay = 0) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    const timeout = setTimeout(() => {
      let start = 0
      const steps = 40
      const step = target / steps
      const interval = 700 / steps
      const timer = setInterval(() => {
        start += step
        if (start >= target) { setCount(target); clearInterval(timer) }
        else setCount(Math.floor(start))
      }, interval)
      return () => clearInterval(timer)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, delay])
  return count
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface StatCardProps {
  value: number
  label: string
  icon: React.ReactNode
  gradient: string
  delay?: number
  animDelay?: string
}

function StatCard({ value, label, icon, gradient, delay = 0, animDelay = '0s' }: StatCardProps) {
  const count = useCountUp(value, delay)
  return (
    <div className="glass rounded-2xl p-5 animate-fade-in-up gradient-border" style={{ animationDelay: animDelay }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: gradient }}>
        {icon}
      </div>
      <p className="text-3xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>{count}</p>
      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-1/2 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
      </div>
    </div>
  )
}

const avatarGradients = [
  'linear-gradient(135deg, #7c3aed, #0891b2)',
  'linear-gradient(135deg, #db2777, #7c3aed)',
  'linear-gradient(135deg, #0891b2, #059669)',
  'linear-gradient(135deg, #d97706, #db2777)',
  'linear-gradient(135deg, #059669, #0891b2)',
]

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<ClientStatus | 'all'>('all')
  const [showNewClient, setShowNewClient] = useState(false)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
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

  async function handleDelete() {
    if (!deletingClient) return
    setDeleteLoading(true)
    await supabase.from('clients').delete().eq('id', deletingClient.id)
    setDeleteLoading(false)
    setDeletingClient(null)
    load()
  }

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

  const clientTaskCount = (clientId: string) =>
    tasks.filter(t => t.client_id === clientId).length

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Gestión de clientes y tareas de tu agencia
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value={clients.length} label="Total clientes" icon={<Users className="w-5 h-5 text-white" />} gradient="linear-gradient(135deg, #7c3aed, #6d28d9)" animDelay="0.05s" delay={0} />
          <StatCard value={activeClients} label="Clientes activos" icon={<CheckCircle className="w-5 h-5 text-white" />} gradient="linear-gradient(135deg, #059669, #0891b2)" animDelay="0.1s" delay={80} />
          <StatCard value={pendingTasks} label="Tareas pendientes" icon={<Clock className="w-5 h-5 text-white" />} gradient="linear-gradient(135deg, #0891b2, #7c3aed)" animDelay="0.15s" delay={160} />
          <StatCard value={overdueTasks} label="Tareas vencidas" icon={<AlertCircle className="w-5 h-5 text-white" />} gradient="linear-gradient(135deg, #dc2626, #db2777)" animDelay="0.2s" delay={240} />
        </div>

        {/* Clients Panel */}
        <div className="glass rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div>
              <h2 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>Clientes</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {clients.length} cliente{clients.length !== 1 ? 's' : ''} en total
              </p>
            </div>
            <button
              onClick={() => setShowNewClient(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}
            >
              <Plus className="w-4 h-4" /> Nuevo cliente
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 px-6 py-3 border-b flex-wrap" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all"
                style={
                  filter === opt.value
                    ? { background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="px-4 py-3">
            {loading ? (
              <div className="space-y-2 p-2">{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Users className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>No hay clientes aún</p>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Crea tu primer cliente con el botón de arriba</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((client, idx) => {
                  const pending = getClientPendingCount(client.id)
                  const nextDue = getClientNextDue(client.id)
                  const grad = avatarGradients[idx % avatarGradients.length]
                  return (
                    <div key={client.id} className="group relative flex items-center gap-3 p-3 rounded-xl transition-all" style={{ transition: 'background 0.18s ease' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white" style={{ background: grad }}>
                        {getInitials(client.name)}
                      </div>

                      {/* Clickable area */}
                      <Link href={`/clients/${client.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{client.name}</p>
                          {client.company && (
                            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>{client.company}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <ClientStatusBadge status={client.status} />
                          {pending > 0 && (
                            <span className="hidden sm:flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold" style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                              {pending}
                            </span>
                          )}
                          {nextDue && (
                            <span className="hidden md:block text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {formatDate(nextDue)}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(255,255,255,0.4)' }} />
                        </div>
                      </Link>

                      {/* Delete button (visible on hover) */}
                      <button
                        onClick={e => { e.stopPropagation(); setDeletingClient(client) }}
                        className="opacity-0 group-hover:opacity-100 transition-all w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.color = '#f87171' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                        title={`Eliminar a ${client.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Client Dialog */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-lg border" style={{ background: 'rgba(15, 12, 35, 0.95)', backdropFilter: 'blur(30px)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'rgba(255,255,255,0.9)' }}>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <ClientForm onSuccess={() => { setShowNewClient(false); load() }} onCancel={() => setShowNewClient(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingClient} onOpenChange={open => !open && setDeletingClient(null)}>
        <DialogContent className="max-w-sm border" style={{ background: 'rgba(15, 12, 35, 0.97)', backdropFilter: 'blur(30px)', borderColor: 'rgba(248,113,113,0.2)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />
              Eliminar cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              ¿Eliminar a{' '}
              <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {deletingClient?.name}
              </span>
              ?{' '}
              {clientTaskCount(deletingClient?.id ?? '') > 0 && (
                <span>
                  Se eliminarán también sus{' '}
                  <span className="font-semibold" style={{ color: '#f87171' }}>
                    {clientTaskCount(deletingClient?.id ?? '')} tarea{clientTaskCount(deletingClient?.id ?? '') !== 1 ? 's' : ''}
                  </span>{' '}
                  y toda su ficha.{' '}
                </span>
              )}
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingClient(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-opacity"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', opacity: deleteLoading ? 0.7 : 1 }}
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

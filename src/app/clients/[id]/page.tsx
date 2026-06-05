'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Client, Task, TaskStatus } from '@/types/database'
import { ClientStatusBadge } from '@/components/ClientStatusBadge'
import { TaskPriorityBadge } from '@/components/TaskPriorityBadge'
import { ClientForm } from '@/components/ClientForm'
import { TaskForm } from '@/components/TaskForm'
import { ClientBrief } from '@/components/ClientBrief'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, isOverdue } from '@/lib/utils'
import { ArrowLeft, Mail, Phone, Edit, Plus, Check, Pencil, Trash2, Calendar, User, AlertTriangle } from 'lucide-react'

const STATUS_GROUPS: { status: TaskStatus; label: string; color: string; bg: string; dotColor: string }[] = [
  { status: 'pending',     label: 'Pendiente',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', dotColor: '#94a3b8' },
  { status: 'in_progress', label: 'En progreso', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  dotColor: '#60a5fa' },
  { status: 'done',        label: 'Hecho',       color: '#34d399', bg: 'rgba(52,211,153,0.08)',  dotColor: '#34d399' },
]

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const dialogStyle = {
  background: 'rgba(15, 12, 35, 0.95)',
  backdropFilter: 'blur(30px)',
  borderColor: 'rgba(255,255,255,0.1)',
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const [client, setClient]         = useState<Client | null>(null)
  const [tasks, setTasks]           = useState<Task[]>([])
  const [showEditClient, setShowEditClient] = useState(false)
  const [showNewTask, setShowNewTask]       = useState(false)
  const [editingTask, setEditingTask]       = useState<Task | null>(null)
  const [deletingTask, setDeletingTask]     = useState<Task | null>(null)
  const [loading, setLoading]               = useState(true)

  async function load() {
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('tasks').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])
    if (!c) { router.push('/'); return }
    setClient(c)
    setTasks(t ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function markDone(task: Task) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id)
    load()
  }

  async function confirmDeleteTask() {
    if (!deletingTask) return
    await supabase.from('tasks').delete().eq('id', deletingTask.id)
    setDeletingTask(null)
    load()
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-5 w-36 rounded-lg" />
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="skeleton w-16 h-16 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-5 w-1/3 rounded" />
              <div className="skeleton h-3.5 w-1/4 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-2">
            {[0,1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
          </div>
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-5 space-y-3">
              {[0,1,2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!client) return null

  const doneTasks = tasks.filter(t => t.status === 'done').length
  const progress  = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  return (
    <>
      <style>{`
        .back-link:hover { color: rgba(255,255,255,0.75) !important; }
        .edit-btn:hover  { background: rgba(255,255,255,0.12) !important; color: rgba(255,255,255,0.9) !important; }
        .task-card:hover { border-color: rgba(255,255,255,0.13) !important; }
      `}</style>

      <div className="space-y-5">
        {/* Back */}
        <Link href="/" className="back-link inline-flex items-center gap-1.5 text-sm transition-colors animate-fade-in" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Link>

        {/* Client Header */}
        <div className="glass rounded-2xl p-5 animate-fade-in-up gradient-border" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}
              >
                {getInitials(client.name)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>{client.name}</h1>
                  <ClientStatusBadge status={client.status} />
                </div>
                {client.company && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{client.company}</p>}
                <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {client.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</span>}
                  {client.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone}</span>}
                </div>
                {client.notes && (
                  <p className="text-sm rounded-lg px-3 py-1.5 max-w-xl" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {client.notes}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => setShowEditClient(true)} className="edit-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
              <Edit className="w-3.5 h-3.5" /> Editar
            </button>
          </div>

          {tasks.length > 0 && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Progreso de tareas</span>
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{doneTasks}/{tasks.length} completadas · {progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #0891b2)', boxShadow: '0 0 10px rgba(124,58,237,0.5)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

          {/* LEFT — Ficha del cliente */}
          <div className="lg:col-span-3">
            <ClientBrief client={client} onTaskCreated={load} />
          </div>

          {/* RIGHT — Tasks panel (sticky) */}
          <div className="lg:col-span-2">
            <div
              className="glass rounded-2xl lg:sticky flex flex-col animate-fade-in-up"
              style={{ top: '4.5rem', maxHeight: 'calc(100vh - 6rem)', animationDelay: '0.15s' }}
            >
              {/* Tasks header */}
              <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div>
                  <h2 className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Tareas</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
                    {doneTasks > 0 ? ` · ${doneTasks} hecha${doneTasks !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowNewTask(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Nueva
                </button>
              </div>

              {/* Tasks scrollable body */}
              <div className="flex-1 overflow-y-auto p-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Check className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.15)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin tareas</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.22)' }}>Agregá la primera tarea</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {STATUS_GROUPS.map(group => {
                      const groupTasks = tasks.filter(t => t.status === group.status)
                      if (groupTasks.length === 0) return null
                      return (
                        <div key={group.status}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.dotColor, boxShadow: `0 0 5px ${group.dotColor}` }} />
                            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>{group.label}</h3>
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: group.bg, color: group.color }}>{groupTasks.length}</span>
                          </div>
                          <div className="space-y-1.5 ml-3.5">
                            {groupTasks.map(task => (
                              <div
                                key={task.id}
                                className="task-card rounded-xl p-3 transition-all"
                                style={{
                                  background: task.status === 'done' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.07)',
                                  opacity: task.status === 'done' ? 0.6 : 1,
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <p className="text-sm font-medium leading-snug" style={{
                                      color: task.status === 'done' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
                                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                    }}>
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <TaskPriorityBadge priority={task.priority} />
                                      {task.due_date && (
                                        <span className="flex items-center gap-1 text-xs" style={{
                                          color: isOverdue(task.due_date) && task.status !== 'done' ? '#f87171' : 'rgba(255,255,255,0.3)',
                                          fontWeight: isOverdue(task.due_date) && task.status !== 'done' ? 600 : 400,
                                        }}>
                                          <Calendar className="w-3 h-3" />{formatDate(task.due_date)}
                                        </span>
                                      )}
                                      {task.assignee && (
                                        <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                          <User className="w-3 h-3" />{task.assignee}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {task.status !== 'done' && (
                                      <button onClick={() => markDone(task)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all" style={{ color: '#34d399' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.14)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        title="Marcar como hecho">
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button onClick={() => setEditingTask(task)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
                                      title="Editar">
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => setDeletingTask(task)} className="w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = '#f87171' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
                                      title="Eliminar">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Client */}
      <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
        <DialogContent className="max-w-lg border" style={dialogStyle}>
          <DialogHeader><DialogTitle style={{ color: 'rgba(255,255,255,0.9)' }}>Editar cliente</DialogTitle></DialogHeader>
          <ClientForm client={client} onSuccess={() => { setShowEditClient(false); load() }} onCancel={() => setShowEditClient(false)} />
        </DialogContent>
      </Dialog>

      {/* New Task */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="max-w-lg border" style={dialogStyle}>
          <DialogHeader><DialogTitle style={{ color: 'rgba(255,255,255,0.9)' }}>Nueva tarea</DialogTitle></DialogHeader>
          <TaskForm clientId={id} onSuccess={() => { setShowNewTask(false); load() }} onCancel={() => setShowNewTask(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Task */}
      <Dialog open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)}>
        <DialogContent className="max-w-lg border" style={dialogStyle}>
          <DialogHeader><DialogTitle style={{ color: 'rgba(255,255,255,0.9)' }}>Editar tarea</DialogTitle></DialogHeader>
          {editingTask && <TaskForm clientId={id} task={editingTask} onSuccess={() => { setEditingTask(null); load() }} onCancel={() => setEditingTask(null)} />}
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation */}
      <Dialog open={!!deletingTask} onOpenChange={open => !open && setDeletingTask(null)}>
        <DialogContent className="max-w-sm border" style={{ background: 'rgba(15,12,35,0.97)', backdropFilter: 'blur(30px)', borderColor: 'rgba(248,113,113,0.2)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} /> Eliminar tarea
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              ¿Eliminar <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>&ldquo;{deletingTask?.title}&rdquo;</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingTask(null)} className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                Cancelar
              </button>
              <button onClick={confirmDeleteTask} className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white' }}>
                Eliminar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

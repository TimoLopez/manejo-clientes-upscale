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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, isOverdue } from '@/lib/utils'
import { ArrowLeft, Mail, Phone, Edit, Plus, Check, Pencil, Trash2, Calendar, User } from 'lucide-react'

const STATUS_GROUPS: { status: TaskStatus; label: string; color: string; bg: string; dotColor: string }[] = [
  { status: 'pending',     label: 'Pendiente',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', dotColor: '#94a3b8' },
  { status: 'in_progress', label: 'En progreso', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  dotColor: '#60a5fa' },
  { status: 'done',        label: 'Hecho',       color: '#34d399', bg: 'rgba(52,211,153,0.08)',  dotColor: '#34d399' },
]

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showEditClient, setShowEditClient] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

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

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    load()
  }

  const dialogStyle = {
    background: 'rgba(15, 12, 35, 0.95)',
    backdropFilter: 'blur(30px)',
    borderColor: 'rgba(255,255,255,0.1)',
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
        <div className="glass rounded-2xl p-6 space-y-3">
          {[0,1,2].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!client) return null

  const doneTasks = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  return (
    <>
      <div className="space-y-6">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm cursor-pointer transition-colors animate-fade-in"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </Link>

        {/* Client Header Card */}
        <div className="glass rounded-2xl p-6 animate-fade-in-up gradient-border" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}
              >
                {getInitials(client.name)}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
                    {client.name}
                  </h1>
                  <ClientStatusBadge status={client.status} />
                </div>
                {client.company && (
                  <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {client.company}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {client.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {client.phone}
                    </span>
                  )}
                </div>
                {client.notes && (
                  <p
                    className="text-sm rounded-lg px-3 py-2 max-w-xl"
                    style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {client.notes}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowEditClient(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
          </div>

          {/* Progress */}
          {tasks.length > 0 && (
            <div className="mt-5 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Progreso de tareas
                </span>
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {doneTasks} / {tasks.length} completadas
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #0891b2)',
                    boxShadow: '0 0 10px rgba(124,58,237,0.5)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tasks Panel */}
        <div className="glass rounded-2xl animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div>
              <h2 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>Tareas</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} registradas
              </p>
            </div>
            <button
              onClick={() => setShowNewTask(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}
            >
              <Plus className="w-4 h-4" />
              Nueva tarea
            </button>
          </div>

          <div className="p-5">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <Check className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.18)' }} />
                </div>
                <p className="font-medium text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Sin tareas registradas
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Agrega la primera tarea para este cliente
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {STATUS_GROUPS.map(group => {
                  const groupTasks = tasks.filter(t => t.status === group.status)
                  if (groupTasks.length === 0) return null
                  return (
                    <div key={group.status}>
                      {/* Group header */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: group.dotColor, boxShadow: `0 0 6px ${group.dotColor}` }} />
                        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>
                          {group.label}
                        </h3>
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-bold ml-1"
                          style={{ background: group.bg, color: group.color }}
                        >
                          {groupTasks.length}
                        </span>
                      </div>

                      {/* Task cards */}
                      <div className="space-y-2 ml-4">
                        {groupTasks.map(task => (
                          <div
                            key={task.id}
                            className="rounded-xl p-3.5 transition-all"
                            style={{
                              background: task.status === 'done' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              opacity: task.status === 'done' ? 0.65 : 1,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <p
                                  className="font-medium text-sm"
                                  style={{
                                    color: task.status === 'done' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.88)',
                                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                                  }}
                                >
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <TaskPriorityBadge priority={task.priority} />
                                  {task.due_date && (
                                    <span
                                      className="flex items-center gap-1 text-xs"
                                      style={{
                                        color: isOverdue(task.due_date) && task.status !== 'done'
                                          ? '#f87171'
                                          : 'rgba(255,255,255,0.32)',
                                        fontWeight: isOverdue(task.due_date) && task.status !== 'done' ? '600' : '400',
                                      }}
                                    >
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(task.due_date)}
                                    </span>
                                  )}
                                  {task.assignee && (
                                    <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                      <User className="w-3 h-3" />
                                      {task.assignee}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                {task.status !== 'done' && (
                                  <button
                                    onClick={() => markDone(task)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                                    style={{ color: '#34d399' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.14)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    title="Marcar como hecho"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                                  style={{ color: 'rgba(255,255,255,0.35)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                                  style={{ color: 'rgba(255,255,255,0.35)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; e.currentTarget.style.color = '#f87171' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

      {/* Edit Client */}
      <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
        <DialogContent className="max-w-lg border" style={dialogStyle}>
          <DialogHeader>
            <DialogTitle style={{ color: 'rgba(255,255,255,0.9)' }}>Editar cliente</DialogTitle>
          </DialogHeader>
          <ClientForm
            client={client}
            onSuccess={() => { setShowEditClient(false); load() }}
            onCancel={() => setShowEditClient(false)}
          />
        </DialogContent>
      </Dialog>

      {/* New Task */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="max-w-lg border" style={dialogStyle}>
          <DialogHeader>
            <DialogTitle style={{ color: 'rgba(255,255,255,0.9)' }}>Nueva tarea</DialogTitle>
          </DialogHeader>
          <TaskForm
            clientId={id}
            onSuccess={() => { setShowNewTask(false); load() }}
            onCancel={() => setShowNewTask(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Task */}
      <Dialog open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)}>
        <DialogContent className="max-w-lg border" style={dialogStyle}>
          <DialogHeader>
            <DialogTitle style={{ color: 'rgba(255,255,255,0.9)' }}>Editar tarea</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm
              clientId={id}
              task={editingTask}
              onSuccess={() => { setEditingTask(null); load() }}
              onCancel={() => setEditingTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

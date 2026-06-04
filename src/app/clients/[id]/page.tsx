'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Client, Task, TaskStatus } from '@/types/database'
import { ClientStatusBadge } from '@/components/ClientStatusBadge'
import { TaskPriorityBadge } from '@/components/TaskPriorityBadge'
import { TaskStatusBadge } from '@/components/TaskStatusBadge'
import { ClientForm } from '@/components/ClientForm'
import { TaskForm } from '@/components/TaskForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { formatDate, isOverdue } from '@/lib/utils'
import { ArrowLeft, Mail, Phone, Edit, Plus, Check, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_GROUPS: { status: TaskStatus; label: string }[] = [
  { status: 'pending', label: 'Pendiente' },
  { status: 'in_progress', label: 'En progreso' },
  { status: 'done', label: 'Hecho' },
]

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

  if (loading) return <p className="text-slate-400 py-16 text-center">Cargando...</p>
  if (!client) return null

  const doneTasks = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

  return (
    <>
      <div className="space-y-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Link>

        {/* Client Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
                  <ClientStatusBadge status={client.status} />
                </div>
                {client.company && <p className="text-slate-500 font-medium">{client.company}</p>}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" /> {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" /> {client.phone}
                    </span>
                  )}
                </div>
                {client.notes && (
                  <p className="text-sm text-slate-500 bg-slate-50 rounded-md px-3 py-2 max-w-xl">{client.notes}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowEditClient(true)}>
                <Edit className="w-4 h-4 mr-1" /> Editar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-2">
              <CardTitle>Tareas</CardTitle>
              {tasks.length > 0 && (
                <div className="flex items-center gap-3">
                  <Progress value={progress} className="w-40 h-2" />
                  <span className="text-sm text-slate-500">{doneTasks} de {tasks.length} completadas</span>
                </div>
              )}
            </div>
            <Button size="sm" onClick={() => setShowNewTask(true)}>
              <Plus className="w-4 h-4 mr-1" /> Nueva tarea
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="font-medium">Sin tareas todavía</p>
                <p className="text-sm mt-1">Agrega la primera tarea para este cliente</p>
              </div>
            ) : (
              <div className="space-y-6">
                {STATUS_GROUPS.map(group => {
                  const groupTasks = tasks.filter(t => t.status === group.status)
                  if (groupTasks.length === 0) return null
                  return (
                    <div key={group.status}>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {group.label} ({groupTasks.length})
                      </h3>
                      <div className="space-y-2">
                        {groupTasks.map(task => (
                          <div
                            key={task.id}
                            className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                              task.status === 'done' ? 'bg-slate-50 opacity-70' : 'bg-white'
                            }`}
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-slate-500 truncate">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <TaskPriorityBadge priority={task.priority} />
                                {task.due_date && (
                                  <span className={`text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                    {formatDate(task.due_date)}
                                  </span>
                                )}
                                {task.assignee && (
                                  <span className="text-xs text-slate-400">&#x2192; {task.assignee}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {task.status !== 'done' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => markDone(task)}>
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700" onClick={() => setEditingTask(task)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => deleteTask(task.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Client Dialog */}
      <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <ClientForm client={client} onSuccess={() => { setShowEditClient(false); load() }} onCancel={() => setShowEditClient(false)} />
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <TaskForm clientId={id} onSuccess={() => { setShowNewTask(false); load() }} onCancel={() => setShowNewTask(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <TaskForm clientId={id} task={editingTask} onSuccess={() => { setEditingTask(null); load() }} onCancel={() => setEditingTask(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

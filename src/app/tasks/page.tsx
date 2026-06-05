'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { TaskPriority, TaskStatus } from '@/types/database'
import { TaskPriorityBadge } from '@/components/TaskPriorityBadge'
import { formatDate } from '@/lib/utils'
import {
  Check, Calendar, User, AlertTriangle, ChevronDown, ChevronUp,
  Clock, Inbox, CalendarDays, Loader2, ListTodo,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskWithClient {
  id:          string
  client_id:   string
  title:       string
  description: string
  priority:    TaskPriority
  due_date:    string | null
  assignee:    string
  status:      TaskStatus
  created_at:  string
  clients:     { id: string; name: string; company: string } | null
}

type PriorityFilter = 'all' | TaskPriority

interface Group {
  key:     string
  label:   string
  color:   string
  bg:      string
  dot:     string
  icon:    React.ReactNode
  tasks:   TaskWithClient[]
  collapsed?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #0891b2)',
  'linear-gradient(135deg, #db2777, #7c3aed)',
  'linear-gradient(135deg, #0891b2, #059669)',
  'linear-gradient(135deg, #d97706, #db2777)',
  'linear-gradient(135deg, #059669, #0891b2)',
]

function clientGrad(id: string) {
  let h = 0
  for (const c of id) h = c.charCodeAt(0) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function dateStr(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks]                   = useState<TaskWithClient[]>([])
  const [loading, setLoading]               = useState(true)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [doneOpen, setDoneOpen]             = useState(false)
  const [markingId, setMarkingId]           = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('tasks')
      .select('*, clients(id, name, company)')
      .order('due_date', { ascending: true, nullsFirst: false })
    setTasks((data ?? []) as TaskWithClient[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markDone(task: TaskWithClient) {
    setMarkingId(task.id)
    await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done' } : t))
    setMarkingId(null)
  }

  // Filter by priority
  const visible = priorityFilter === 'all'
    ? tasks
    : tasks.filter(t => t.priority === priorityFilter)

  // Categorize into groups
  const today    = dateStr(0)
  const in7days  = dateStr(7)
  const in30days = dateStr(30)

  const active = visible.filter(t => t.status !== 'done')
  const done   = visible.filter(t => t.status === 'done')

  const groups: Group[] = [
    {
      key: 'overdue', label: 'Vencidas', color: '#f87171', bg: 'rgba(248,113,113,0.08)', dot: '#f87171',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      tasks: active.filter(t => t.due_date && t.due_date < today).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    },
    {
      key: 'today', label: 'Hoy', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', dot: '#fbbf24',
      icon: <Clock className="w-3.5 h-3.5" />,
      tasks: active.filter(t => t.due_date === today),
    },
    {
      key: 'week', label: 'Esta semana', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', dot: '#60a5fa',
      icon: <Calendar className="w-3.5 h-3.5" />,
      tasks: active.filter(t => t.due_date && t.due_date > today && t.due_date <= in7days),
    },
    {
      key: 'upcoming', label: 'Próximamente', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', dot: '#a78bfa',
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      tasks: active.filter(t => t.due_date && t.due_date > in7days && t.due_date <= in30days),
    },
    {
      key: 'nodate', label: 'Sin fecha', color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', dot: '#94a3b8',
      icon: <Inbox className="w-3.5 h-3.5" />,
      tasks: active.filter(t => !t.due_date),
    },
  ].filter(g => g.tasks.length > 0)

  const totalActive = active.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>Todas las tareas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {loading ? '…' : `${totalActive} pendiente${totalActive !== 1 ? 's' : ''} · ${done.length} completada${done.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Priority filter */}
      <div className="flex gap-2 flex-wrap animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
        {([
          { value: 'all',    label: 'Todas' },
          { value: 'high',   label: 'Alta prioridad' },
          { value: 'medium', label: 'Media' },
          { value: 'low',    label: 'Baja' },
        ] as { value: PriorityFilter; label: string }[]).map(opt => (
          <button
            key={opt.value}
            onClick={() => setPriorityFilter(opt.value)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
            style={
              priorityFilter === opt.value
                ? { background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
      ) : totalActive === 0 && done.length === 0 ? (
        <div className="glass rounded-2xl py-20 text-center animate-fade-in">
          <ListTodo className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Sin tareas</p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Creá tareas desde la ficha de cada cliente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active groups */}
          {groups.map((group, gi) => (
            <div
              key={group.key}
              className="glass rounded-2xl overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${0.08 + gi * 0.05}s` }}
            >
              {/* Group header */}
              <div className="flex items-center gap-2.5 px-5 py-3 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.07)', background: group.bg }}>
                <span style={{ color: group.color }}>{group.icon}</span>
                <h2 className="text-sm font-semibold" style={{ color: group.color }}>{group.label}</h2>
                <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{ background: `${group.dot}20`, color: group.dot }}>
                  {group.tasks.length}
                </span>
              </div>

              {/* Task rows */}
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {group.tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isOverdue={group.key === 'overdue'}
                    isMarking={markingId === task.id}
                    onMarkDone={() => markDone(task)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Completed (collapsible) */}
          {done.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
              <button
                onClick={() => setDoneOpen(o => !o)}
                className="w-full flex items-center gap-2.5 px-5 py-3 border-b cursor-pointer transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(52,211,153,0.05)' }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                <span className="text-sm font-semibold" style={{ color: '#34d399' }}>Completadas</span>
                <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                  {done.length}
                </span>
                <span className="ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {doneOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {doneOpen && (
                <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  {done.map(task => (
                    <TaskRow key={task.id} task={task} done isMarking={false} onMarkDone={() => {}} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  isOverdue = false,
  done = false,
  isMarking,
  onMarkDone,
}: {
  task:       TaskWithClient
  isOverdue?: boolean
  done?:      boolean
  isMarking:  boolean
  onMarkDone: () => void
}) {
  const clientName = task.clients?.name ?? 'Cliente'
  const clientId   = task.clients?.id ?? task.client_id
  const grad       = clientGrad(clientId)

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 transition-all"
      style={{
        opacity: done ? 0.55 : 1,
        background: 'transparent',
      }}
      onMouseEnter={e => !done && (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Client avatar → link */}
      <Link href={`/clients/${clientId}`} className="flex items-center gap-2 shrink-0 group/client"
        title={`Ir a ${clientName}`}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 transition-transform group-hover/client:scale-110"
          style={{ background: grad }}>
          {getInitials(clientName)}
        </div>
        <span className="hidden sm:block text-xs font-medium max-w-[90px] truncate"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          {clientName}
        </span>
      </Link>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate"
          style={{
            color: done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
            textDecoration: done ? 'line-through' : 'none',
          }}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 shrink-0">
        <TaskPriorityBadge priority={task.priority} />

        {task.due_date && (
          <span className="hidden md:flex items-center gap-1 text-xs"
            style={{ color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.35)', fontWeight: isOverdue ? 600 : 400 }}>
            <Calendar className="w-3 h-3" />
            {formatDate(task.due_date)}
          </span>
        )}

        {task.assignee && (
          <span className="hidden lg:flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <User className="w-3 h-3" />{task.assignee}
          </span>
        )}

        {/* Mark done */}
        {!done && (
          <button
            onClick={onMarkDone}
            disabled={isMarking}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
            style={{ color: '#34d399' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Marcar como hecho"
          >
            {isMarking
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Check className="w-3.5 h-3.5" />
            }
          </button>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Task, TaskPriority, TaskStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TaskFormProps {
  clientId: string
  task?: Task
  onSuccess: () => void
  onCancel: () => void
}

export function TaskForm({ clientId, task, onSuccess, onCancel }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    priority: task?.priority ?? 'medium' as TaskPriority,
    due_date: task?.due_date ?? '',
    assignee: task?.assignee ?? '',
    status: task?.status ?? 'pending' as TaskStatus,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form, due_date: form.due_date || null }
    if (task) {
      await supabase.from('tasks').update(payload).eq('id', task.id)
    } else {
      await supabase.from('tasks').insert({ ...payload, client_id: clientId })
    }
    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Título</Label>
        <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div className="space-y-1">
        <Label>Descripción</Label>
        <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Prioridad</Label>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as TaskPriority }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TaskStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En progreso</SelectItem>
              <SelectItem value="done">Hecho</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Fecha límite</Label>
          <Input type="date" value={form.due_date ?? ''} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Asignado a</Label>
          <Input value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : task ? 'Guardar cambios' : 'Crear tarea'}</Button>
      </div>
    </form>
  )
}

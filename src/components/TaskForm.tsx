'use client'

import { useState } from 'react'
import { Task, TaskPriority, TaskStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface TaskFormProps {
  clientId: string
  task?: Task
  onSuccess: () => void
  onCancel: () => void
}

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.5rem',
  color: 'rgba(255,255,255,0.9)',
  padding: '0.5rem 0.75rem',
  width: '100%',
  outline: 'none',
  fontSize: '0.875rem',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '500',
  color: 'rgba(255,255,255,0.5)',
  marginBottom: '0.375rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
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

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'rgba(167,139,250,0.5)'
    e.target.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.1)'
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
    e.target.style.boxShadow = 'none'
  }

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

  const sharedProps = {
    style: inputStyle,
    onFocus: handleFocus,
    onBlur: handleBlur,
  }

  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label style={labelStyle}>Título *</label>
        <input
          required
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Nombre de la tarea"
          {...sharedProps}
        />
      </div>
      <div>
        <label style={labelStyle}>Descripción</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Detalles opcionales..."
          style={{ ...inputStyle, resize: 'vertical' }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Prioridad</label>
          <select
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
            style={selectStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="low" style={{ background: '#0f0f1a' }}>Baja</option>
            <option value="medium" style={{ background: '#0f0f1a' }}>Media</option>
            <option value="high" style={{ background: '#0f0f1a' }}>Alta</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Estado</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
            style={selectStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="pending" style={{ background: '#0f0f1a' }}>Pendiente</option>
            <option value="in_progress" style={{ background: '#0f0f1a' }}>En progreso</option>
            <option value="done" style={{ background: '#0f0f1a' }}>Hecho</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Fecha límite</label>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            {...sharedProps}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Asignado a</label>
          <input
            value={form.assignee}
            onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
            placeholder="Nombre del responsable"
            {...sharedProps}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
            color: 'white',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Guardando...' : task ? 'Guardar cambios' : 'Crear tarea'}
        </button>
      </div>
    </form>
  )
}

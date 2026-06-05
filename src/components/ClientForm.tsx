'use client'

import { useState } from 'react'
import { Client, ClientStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface ClientFormProps {
  client?: Client
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

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: client?.name ?? '',
    company: client?.company ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    status: client?.status ?? 'lead' as ClientStatus,
    notes: client?.notes ?? '',
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
    if (client) {
      await supabase.from('clients').update(form).eq('id', client.id)
    } else {
      await supabase.from('clients').insert(form)
    }
    setLoading(false)
    onSuccess()
  }

  const sharedInputProps = {
    style: inputStyle,
    onFocus: handleFocus,
    onBlur: handleBlur,
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Nombre *</label>
          <input
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Juan García"
            {...sharedInputProps}
          />
        </div>
        <div>
          <label style={labelStyle}>Empresa</label>
          <input
            value={form.company}
            onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
            placeholder="Acme Corp"
            {...sharedInputProps}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="juan@empresa.com"
            {...sharedInputProps}
          />
        </div>
        <div>
          <label style={labelStyle}>Teléfono</label>
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+54 11 0000-0000"
            {...sharedInputProps}
          />
        </div>
        <div className="col-span-2">
          <label style={labelStyle}>Estado</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as ClientStatus }))}
            style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="lead" style={{ background: '#0f0f1a' }}>Lead</option>
            <option value="active" style={{ background: '#0f0f1a' }}>Activo</option>
            <option value="paused" style={{ background: '#0f0f1a' }}>Pausado</option>
            <option value="finished" style={{ background: '#0f0f1a' }}>Finalizado</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Notas</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Notas adicionales..."
          style={{ ...inputStyle, resize: 'vertical' }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
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
          className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
            color: 'white',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Guardando...' : client ? 'Guardar cambios' : 'Crear cliente'}
        </button>
      </div>
    </form>
  )
}

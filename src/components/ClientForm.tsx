'use client'

import { useState } from 'react'
import { Client, ClientStatus } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ClientFormProps {
  client?: Client
  onSuccess: () => void
  onCancel: () => void
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Empresa</Label>
          <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Teléfono</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ClientStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="finished">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notas</Label>
        <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : client ? 'Guardar cambios' : 'Crear cliente'}</Button>
      </div>
    </form>
  )
}

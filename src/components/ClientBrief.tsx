'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Client } from '@/types/database'
import { CheckCircle2, Loader2, ArrowRight, Telescope, Lightbulb, Save } from 'lucide-react'

interface BriefData {
  last_action: string
  pending_notes: string
  next_steps: string
  future_steps: string
  ideas: string
}

interface Section {
  key: keyof BriefData
  label: string
  sublabel: string
  icon: React.ReactNode
  color: string
  glow: string
  placeholder: string
  span?: 'full'
}

const SECTIONS: Section[] = [
  {
    key: 'last_action',
    label: 'Último hecho',
    sublabel: 'Lo último que se entregó o completó',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: '#34d399',
    glow: 'rgba(52,211,153,0.18)',
    placeholder: 'ej: Se entregó el calendario de contenidos de junio, revisamos la estrategia de reels...',
  },
  {
    key: 'pending_notes',
    label: 'En curso / Pendiente',
    sublabel: 'Lo que está en trabajo ahora mismo',
    icon: <Loader2 className="w-4 h-4" />,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.18)',
    placeholder: 'ej: Esperando aprobación del copy para la campaña de lanzamiento...',
  },
  {
    key: 'next_steps',
    label: 'Próximos pasos',
    sublabel: 'Acciones concretas a corto plazo',
    icon: <ArrowRight className="w-4 h-4" />,
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.18)',
    placeholder: 'ej: Call de feedback el lunes. Enviar propuesta de influencers esta semana...',
  },
  {
    key: 'future_steps',
    label: 'A futuro',
    sublabel: 'Objetivos y planes a largo plazo',
    icon: <Telescope className="w-4 h-4" />,
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.18)',
    placeholder: 'ej: Explorar expansión a TikTok en Q3. Rediseño de branding para fin de año...',
  },
  {
    key: 'ideas',
    label: 'Ideas y potencial',
    sublabel: 'Ideas a explorar o proponer al cliente',
    icon: <Lightbulb className="w-4 h-4" />,
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.18)',
    placeholder: 'ej: Podríamos proponer un pack de UGC. La marca encajaría bien con micro-influencers de nicho...',
    span: 'full',
  },
]

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 80)}px`
}

export function ClientBrief({ client }: { client: Client }) {
  const [data, setData] = useState<BriefData>({
    last_action:    client.last_action    ?? '',
    pending_notes:  client.pending_notes  ?? '',
    next_steps:     client.next_steps     ?? '',
    future_steps:   client.future_steps   ?? '',
    ideas:          client.ideas          ?? '',
  })
  const [saving, setSaving] = useState<keyof BriefData | null>(null)
  const [saved,  setSaved]  = useState<keyof BriefData | null>(null)
  const dirty   = useRef<Set<keyof BriefData>>(new Set())
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  useEffect(() => {
    SECTIONS.forEach(s => autoResize(textRefs.current[s.key]))
  }, [])

  const handleChange = useCallback((key: keyof BriefData, value: string) => {
    setData(d => ({ ...d, [key]: value }))
    dirty.current.add(key)
    autoResize(textRefs.current[key])
  }, [])

  const handleBlur = useCallback(async (key: keyof BriefData) => {
    if (!dirty.current.has(key)) return
    dirty.current.delete(key)
    setSaving(key)
    await supabase.from('clients').update({ [key]: data[key] }).eq('id', client.id)
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(s => (s === key ? null : s)), 2200)
  }, [data, client.id])

  const hasAnyContent = Object.values(data).some(v => v.trim().length > 0)

  return (
    <div
      className="rounded-2xl animate-fade-in-up"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        animationDelay: '0.2s',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div>
          <h2 className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Ficha del cliente
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Estado, avances y dirección estratégica · Se guarda automáticamente
          </p>
        </div>
        {!hasAnyContent && (
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            Sin completar
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {SECTIONS.map(section => (
          <div
            key={section.key}
            className={`rounded-xl overflow-hidden transition-all ${section.span === 'full' ? 'md:col-span-2' : ''}`}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${section.color}`,
            }}
            onFocus={() => {
              const el = document.getElementById(`brief-${section.key}`)?.closest('.brief-card') as HTMLElement
              if (el) el.style.borderColor = `${section.color}50`
            }}
          >
            {/* Section header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b"
              style={{
                borderColor: 'rgba(255,255,255,0.05)',
                background: `linear-gradient(135deg, ${section.glow}, transparent)`,
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: section.color }}>{section.icon}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: section.color }}>
                    {section.label}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {section.sublabel}
                  </p>
                </div>
              </div>

              {/* Save indicator */}
              <div className="w-20 flex justify-end">
                {saving === section.key && (
                  <span className="flex items-center gap-1 text-xs animate-fade-in" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Save className="w-3 h-3 animate-spin" />
                    Guardando
                  </span>
                )}
                {saved === section.key && saving !== section.key && (
                  <span className="flex items-center gap-1 text-xs animate-fade-in" style={{ color: section.color }}>
                    <CheckCircle2 className="w-3 h-3" />
                    Guardado
                  </span>
                )}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              id={`brief-${section.key}`}
              ref={el => { textRefs.current[section.key] = el }}
              value={data[section.key]}
              onChange={e => handleChange(section.key, e.target.value)}
              onBlur={() => handleBlur(section.key)}
              placeholder={section.placeholder}
              rows={3}
              className="w-full resize-none outline-none text-sm leading-relaxed"
              style={{
                background: 'transparent',
                color: 'rgba(255,255,255,0.78)',
                padding: '12px 16px',
                caretColor: section.color,
                minHeight: '80px',
                display: 'block',
              }}
              onInput={e => autoResize(e.currentTarget)}
            />
          </div>
        ))}
      </div>

      {/* Placeholder text if all empty */}
      {!hasAnyContent && (
        <p className="text-xs text-center pb-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Hacé clic en cualquier sección para empezar a escribir
        </p>
      )}
    </div>
  )
}

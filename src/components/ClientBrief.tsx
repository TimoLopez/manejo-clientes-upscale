'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Client } from '@/types/database'
import { CheckCircle2, Loader2, ArrowRight, Telescope, Lightbulb, Save, Mic, MicOff, Sparkles, AlertCircle } from 'lucide-react'

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
    glow: 'rgba(52,211,153,0.15)',
    placeholder: 'ej: Se entregó el calendario de contenidos de junio, revisamos la estrategia de reels...',
  },
  {
    key: 'pending_notes',
    label: 'En curso / Pendiente',
    sublabel: 'Lo que está en trabajo ahora mismo',
    icon: <Loader2 className="w-4 h-4" />,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.15)',
    placeholder: 'ej: Esperando aprobación del copy para la campaña de lanzamiento...',
  },
  {
    key: 'next_steps',
    label: 'Próximos pasos',
    sublabel: 'Acciones concretas a corto plazo',
    icon: <ArrowRight className="w-4 h-4" />,
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.15)',
    placeholder: 'ej: Call de feedback el lunes. Enviar propuesta de influencers esta semana...',
  },
  {
    key: 'future_steps',
    label: 'A futuro',
    sublabel: 'Objetivos y planes a largo plazo',
    icon: <Telescope className="w-4 h-4" />,
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
    placeholder: 'ej: Explorar expansión a TikTok en Q3. Rediseño de branding para fin de año...',
  },
  {
    key: 'ideas',
    label: 'Ideas y potencial',
    sublabel: 'Ideas a explorar o proponer al cliente',
    icon: <Lightbulb className="w-4 h-4" />,
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.15)',
    placeholder: 'ej: Podríamos proponer un pack de UGC. La marca encajaría bien con micro-influencers de nicho...',
    span: 'full',
  },
]

type VoiceState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 80)}px`
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function ClientBrief({ client }: { client: Client }) {
  const [data, setData] = useState<BriefData>({
    last_action:   client.last_action   ?? '',
    pending_notes: client.pending_notes ?? '',
    next_steps:    client.next_steps    ?? '',
    future_steps:  client.future_steps  ?? '',
    ideas:         client.ideas         ?? '',
  })
  const [saving, setSaving] = useState<keyof BriefData | null>(null)
  const [saved,  setSaved]  = useState<keyof BriefData | null>(null)
  const dirty    = useRef<Set<keyof BriefData>>(new Set())
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  // Voice state
  const [voiceState, setVoiceState]           = useState<VoiceState>('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [aiTranscript, setAiTranscript]         = useState('')
  const [popSections, setPopSections]           = useState<Set<keyof BriefData>>(new Set())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-resize all textareas when data changes (also after AI fills)
  useEffect(() => {
    SECTIONS.forEach(s => autoResize(textRefs.current[s.key]))
  }, [data])

  // --- Manual edit handlers ---
  const handleChange = useCallback((key: keyof BriefData, value: string) => {
    setData(d => ({ ...d, [key]: value }))
    dirty.current.add(key)
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

  // --- Voice recording ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder  = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const ext  = mimeType.includes('webm') ? 'webm' : 'mp4'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        await processAudio(blob, ext)
      }

      recorder.start(250)
      mediaRecorderRef.current = recorder
      setVoiceState('recording')
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert('No se pudo acceder al micrófono. Revisá los permisos del navegador.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    setVoiceState('processing')
  }

  async function processAudio(blob: Blob, ext: string) {
    try {
      const form = new FormData()
      form.append('audio', blob, `recording.${ext}`)

      const res = await fetch('/api/voice-brief', { method: 'POST', body: form })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error ?? 'Error desconocido')

      setAiTranscript(result.transcript)

      // Only fill non-empty fields returned by AI
      const filled = new Set<keyof BriefData>()
      const update: Partial<BriefData> = {}
      const newData = { ...data }

      ;(Object.keys(result.brief) as (keyof BriefData)[]).forEach(k => {
        const val = result.brief[k]
        if (val && val.trim()) {
          newData[k]  = val
          update[k]   = val
          filled.add(k)
        }
      })

      setData(newData)

      if (Object.keys(update).length > 0) {
        await supabase.from('clients').update(update).eq('id', client.id)
      }

      // Highlight filled sections briefly
      setPopSections(filled)
      setTimeout(() => setPopSections(new Set()), 1800)

      setVoiceState('done')
      setTimeout(() => setVoiceState('idle'), 4000)
    } catch (err) {
      console.error('[voice-brief]', err)
      setVoiceState('error')
      setTimeout(() => setVoiceState('idle'), 3500)
    }
  }

  const hasAnyContent = Object.values(data).some(v => v.trim().length > 0)

  return (
    <div
      className="rounded-2xl animate-fade-in-up"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: '0.12s' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <h2 className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>Ficha del cliente</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Estado · Avances · Estrategia · Auto-guardado
          </p>
        </div>

        {/* Voice button area */}
        <div className="flex items-center gap-2">
          {voiceState === 'idle' && (
            <button
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-opacity hover:opacity-85"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}
              title="Dictá el estado del cliente con tu voz — la IA llena la ficha automáticamente"
            >
              <Mic className="w-3.5 h-3.5" />
              Dictar con IA
            </button>
          )}

          {voiceState === 'recording' && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              {/* Waveform bars */}
              <div className="flex items-end gap-px h-3.5">
                {[0.5, 1, 0.7, 0.9, 0.6, 1, 0.4].map((h, i) => (
                  <div
                    key={i}
                    className="w-0.5 rounded-full origin-bottom"
                    style={{
                      background: '#f87171',
                      height: `${h * 14}px`,
                      animation: `waveBar 0.7s ease-in-out ${i * 0.09}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <span>{formatSeconds(recordingSeconds)}</span>
              <MicOff className="w-3.5 h-3.5" />
              <span>Detener</span>
            </button>
          )}

          {voiceState === 'processing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analizando con IA...
            </div>
          )}

          {voiceState === 'done' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs animate-fade-in" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
              <Sparkles className="w-3.5 h-3.5" />
              ¡Ficha actualizada!
            </div>
          )}

          {voiceState === 'error' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs animate-fade-in" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-3.5 h-3.5" />
              Error. Intentá de nuevo.
            </div>
          )}
        </div>
      </div>

      {/* Transcript preview */}
      {aiTranscript && voiceState !== 'recording' && voiceState !== 'processing' && (
        <div
          className="mx-5 mt-3 p-3 rounded-lg text-xs animate-fade-in"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}
        >
          <span style={{ color: 'rgba(167,139,250,0.7)', fontWeight: 600 }}>Transcripción: </span>
          {aiTranscript}
        </div>
      )}

      {/* Sections grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {SECTIONS.map(section => (
          <div
            key={section.key}
            className={`rounded-xl overflow-hidden ${section.span === 'full' ? 'md:col-span-2' : ''}`}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${section.color}`,
              animation: popSections.has(section.key) ? 'briefPop 1.4s ease' : 'none',
            }}
          >
            {/* Section header */}
            <div
              className="flex items-center justify-between px-4 py-2 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.05)', background: `linear-gradient(135deg, ${section.glow}, transparent)` }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: section.color }}>{section.icon}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: section.color }}>{section.label}</p>
                  <p className="text-xs leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>{section.sublabel}</p>
                </div>
              </div>
              <div className="w-20 flex justify-end">
                {saving === section.key && (
                  <span className="flex items-center gap-1 text-xs animate-fade-in" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <Save className="w-3 h-3 animate-spin" /> Guardando
                  </span>
                )}
                {saved === section.key && saving !== section.key && (
                  <span className="flex items-center gap-1 text-xs animate-fade-in" style={{ color: section.color }}>
                    <CheckCircle2 className="w-3 h-3" /> Guardado
                  </span>
                )}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={el => { textRefs.current[section.key] = el }}
              value={data[section.key]}
              onChange={e => handleChange(section.key, e.target.value)}
              onBlur={() => handleBlur(section.key)}
              placeholder={section.placeholder}
              rows={3}
              className="w-full resize-none outline-none text-sm leading-relaxed block"
              style={{
                background: 'transparent',
                color: 'rgba(255,255,255,0.78)',
                padding: '10px 16px',
                caretColor: section.color,
                minHeight: '80px',
              }}
            />
          </div>
        ))}
      </div>

      {!hasAnyContent && voiceState === 'idle' && (
        <p className="text-xs text-center pb-3" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Escribí directamente o usá "Dictar con IA" para hablar y que la IA rellene la ficha
        </p>
      )}
    </div>
  )
}

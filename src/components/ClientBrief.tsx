'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Client, TaskPriority } from '@/types/database'
import {
  CheckCircle2, Loader2, ArrowRight, Telescope, Lightbulb, Save,
  Mic, MicOff, Sparkles, AlertCircle, X, Plus, Calendar, User,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BriefData {
  last_action:   string
  pending_notes: string
  next_steps:    string
  future_steps:  string
  ideas:         string
}

interface BriefProposal {
  key:      keyof BriefData
  label:    string
  color:    string
  icon:     React.ReactNode
  existing: string
  content:  string
  action:   'replace' | 'append'
  reason:   string
}

interface DetectedTask {
  _id:         string
  title:       string
  description: string
  priority:    TaskPriority
  due_date:    string
  assignee:    string
}

interface Section {
  key:         keyof BriefData
  label:       string
  sublabel:    string
  icon:        React.ReactNode
  color:       string
  glow:        string
  placeholder: string
  span?:       'full'
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    key: 'last_action', label: 'Último hecho', sublabel: 'Lo último que se entregó o completó',
    icon: <CheckCircle2 className="w-4 h-4" />, color: '#34d399', glow: 'rgba(52,211,153,0.15)',
    placeholder: 'ej: Se entregó el calendario de contenidos de junio...',
  },
  {
    key: 'pending_notes', label: 'En curso / Pendiente', sublabel: 'Lo que está en trabajo ahora mismo',
    icon: <Loader2 className="w-4 h-4" />, color: '#fbbf24', glow: 'rgba(251,191,36,0.15)',
    placeholder: 'ej: Esperando aprobación del copy para la campaña...',
  },
  {
    key: 'next_steps', label: 'Próximos pasos', sublabel: 'Acciones concretas a corto plazo',
    icon: <ArrowRight className="w-4 h-4" />, color: '#60a5fa', glow: 'rgba(96,165,250,0.15)',
    placeholder: 'ej: Call de feedback el lunes. Enviar propuesta de influencers...',
  },
  {
    key: 'future_steps', label: 'A futuro', sublabel: 'Objetivos y planes a largo plazo',
    icon: <Telescope className="w-4 h-4" />, color: '#a78bfa', glow: 'rgba(167,139,250,0.15)',
    placeholder: 'ej: Explorar expansión a TikTok en Q3...',
  },
  {
    key: 'ideas', label: 'Ideas y potencial', sublabel: 'Ideas a explorar o proponer al cliente',
    icon: <Lightbulb className="w-4 h-4" />, color: '#22d3ee', glow: 'rgba(34,211,238,0.15)',
    placeholder: 'ej: Podríamos proponer un pack de UGC...',
    span: 'full',
  },
]

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; next: TaskPriority }> = {
  low:    { label: 'Baja',  color: '#94a3b8', next: 'medium' },
  medium: { label: 'Media', color: '#fb923c', next: 'high'   },
  high:   { label: 'Alta',  color: '#f87171', next: 'low'    },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.max(el.scrollHeight, 80)}px`
}

function formatSeconds(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function truncateLines(text: string, max: number) {
  const lines = text.split('\n')
  if (lines.length <= max) return text
  return lines.slice(0, max).join('\n') + `\n… (+${lines.length - max} más)`
}

let _taskIdCounter = 0
function nextId() { return `dt-${++_taskIdCounter}` }

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientBrief({
  client,
  onTaskCreated,
}: {
  client: Client
  onTaskCreated?: () => void
}) {
  // Brief data
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

  // Voice
  const [voiceState, setVoiceState]             = useState<VoiceState>('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [aiTranscript, setAiTranscript]         = useState('')
  const [popSections, setPopSections]           = useState<Set<keyof BriefData>>(new Set())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)

  // AI proposals for existing fields
  const [pendingProposals, setPendingProposals]   = useState<BriefProposal[]>([])
  const [proposalActions, setProposalActions]     = useState<Record<string, 'replace' | 'append'>>({})
  const [applyingAll, setApplyingAll]             = useState(false)

  // Detected tasks
  const [detectedTasks, setDetectedTasks] = useState<DetectedTask[]>([])
  const [createdIds, setCreatedIds]       = useState<Set<string>>(new Set())
  const [creatingId, setCreatingId]       = useState<string | null>(null)
  const [creatingAll, setCreatingAll]     = useState(false)

  // Auto-resize textareas when data changes
  useEffect(() => {
    SECTIONS.forEach(s => autoResize(textRefs.current[s.key]))
  }, [data])

  // ── Manual edit ────────────────────────────────────────────────────────────

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
    setTimeout(() => setSaved(s => s === key ? null : s), 2200)
  }, [data, client.id])

  // ── Voice recording ────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream  = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })

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
      setDetectedTasks([])
      setCreatedIds(new Set())
      setAiTranscript('')
      setPendingProposals([])
      setProposalActions({})
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
      // Send existing content so the AI can reason about it
      form.append('existing_brief', JSON.stringify({
        last_action:   data.last_action,
        pending_notes: data.pending_notes,
        next_steps:    data.next_steps,
        future_steps:  data.future_steps,
        ideas:         data.ideas,
      }))

      const res    = await fetch('/api/voice-brief', { method: 'POST', body: form })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Error desconocido')

      setAiTranscript(result.transcript)

      // Process brief field proposals
      type FieldResult = { content: string; action: string; reason: string }
      const briefResult = result.brief as Record<keyof BriefData, FieldResult>

      const immediateUpdate: Partial<BriefData> = {}
      const proposals: BriefProposal[] = []
      const initActions: Record<string, 'replace' | 'append'> = {}
      const newData = { ...data }
      const filled  = new Set<keyof BriefData>()

      for (const section of SECTIONS) {
        const field = briefResult[section.key]
        if (!field || field.action === 'keep' || !field.content?.trim()) continue

        const existing = data[section.key]?.trim()

        if (!existing) {
          // Empty field → auto-fill immediately, no confirmation needed
          newData[section.key] = field.content
          immediateUpdate[section.key] = field.content
          filled.add(section.key)
        } else {
          // Field already has content → queue proposal for user to review
          const action: 'replace' | 'append' = field.action === 'replace' ? 'replace' : 'append'
          proposals.push({
            key:      section.key,
            label:    section.label,
            color:    section.color,
            icon:     section.icon,
            existing,
            content:  field.content,
            action,
            reason:   field.reason,
          })
          initActions[section.key] = action
        }
      }

      setData(newData)
      if (Object.keys(immediateUpdate).length > 0) {
        await supabase.from('clients').update(immediateUpdate).eq('id', client.id)
      }
      setPopSections(filled)
      setTimeout(() => setPopSections(new Set()), 1800)
      setPendingProposals(proposals)
      setProposalActions(initActions)

      // Load detected tasks
      if (Array.isArray(result.tasks) && result.tasks.length > 0) {
        setDetectedTasks(result.tasks.map((t: Record<string, unknown>) => ({
          _id:         nextId(),
          title:       String(t.title       ?? '').trim(),
          description: String(t.description ?? ''),
          priority:    (['low', 'medium', 'high'].includes(String(t.priority)) ? t.priority : 'medium') as TaskPriority,
          due_date:    t.due_date ? String(t.due_date) : '',
          assignee:    String(t.assignee    ?? ''),
        })))
      }

      setVoiceState('done')
      setTimeout(() => setVoiceState('idle'), 4000)
    } catch (err) {
      console.error('[voice-brief]', err)
      setVoiceState('error')
      setTimeout(() => setVoiceState('idle'), 3500)
    }
  }

  // ── Proposal actions ────────────────────────────────────────────────────────

  function toggleProposalAction(key: string) {
    setProposalActions(prev => ({
      ...prev,
      [key]: prev[key] === 'replace' ? 'append' : 'replace',
    }))
  }

  async function applyProposal(proposal: BriefProposal) {
    const action   = proposalActions[proposal.key] ?? proposal.action
    const existing = data[proposal.key]?.trim()
    const newVal   = action === 'append' && existing
      ? `${existing}\n${proposal.content}`
      : proposal.content

    setData(d => ({ ...d, [proposal.key]: newVal }))
    await supabase.from('clients').update({ [proposal.key]: newVal }).eq('id', client.id)
    setPendingProposals(prev => prev.filter(p => p.key !== proposal.key))
    setPopSections(new Set([proposal.key]))
    setTimeout(() => setPopSections(new Set()), 1800)
  }

  async function applyAllProposals() {
    if (pendingProposals.length === 0) return
    setApplyingAll(true)
    const updates: Partial<BriefData> = {}
    const newData = { ...data }
    const filled  = new Set<keyof BriefData>()

    for (const proposal of pendingProposals) {
      const action   = proposalActions[proposal.key] ?? proposal.action
      const existing = data[proposal.key]?.trim()
      const newVal   = action === 'append' && existing
        ? `${existing}\n${proposal.content}`
        : proposal.content
      newData[proposal.key] = newVal
      updates[proposal.key] = newVal
      filled.add(proposal.key)
    }

    setData(newData)
    await supabase.from('clients').update(updates).eq('id', client.id)
    setPendingProposals([])
    setApplyingAll(false)
    setPopSections(filled)
    setTimeout(() => setPopSections(new Set()), 1800)
  }

  function dismissProposal(key: keyof BriefData) {
    setPendingProposals(prev => prev.filter(p => p.key !== key))
  }

  // ── Task actions ───────────────────────────────────────────────────────────

  function updateTask(id: string, patch: Partial<DetectedTask>) {
    setDetectedTasks(prev => prev.map(t => t._id === id ? { ...t, ...patch } : t))
  }

  function dismissTask(id: string) {
    setDetectedTasks(prev => prev.filter(t => t._id !== id))
  }

  async function _insertTask(task: DetectedTask): Promise<boolean> {
    const { error } = await supabase.from('tasks').insert({
      client_id:   client.id,
      title:       task.title.trim(),
      description: task.description || '',
      priority:    task.priority,
      due_date:    task.due_date || null,
      assignee:    task.assignee || '',
      status:      'pending',
    })
    if (error) {
      console.error('[createTask]', error.message, error.details)
      return false
    }
    return true
  }

  async function createTask(task: DetectedTask) {
    if (!task.title.trim()) return
    setCreatingId(task._id)
    const ok = await _insertTask(task)
    setCreatingId(null)
    if (ok) {
      setCreatedIds(prev => new Set([...prev, task._id]))
      onTaskCreated?.()
    } else {
      alert('No se pudo crear la tarea. Revisá la consola para más detalles.')
    }
  }

  async function createAllTasks() {
    const pending = detectedTasks.filter(t => !createdIds.has(t._id) && t.title.trim())
    if (pending.length === 0) return
    setCreatingAll(true)
    let anyOk = false
    for (const t of pending) {
      const ok = await _insertTask(t)
      if (ok) {
        setCreatedIds(prev => new Set([...prev, t._id]))
        anyOk = true
      }
    }
    setCreatingAll(false)
    if (anyOk) onTaskCreated?.()
  }

  const pendingTasks  = detectedTasks.filter(t => !createdIds.has(t._id))
  const hasAnyContent = Object.values(data).some(v => v.trim().length > 0)

  // ── Render ─────────────────────────────────────────────────────────────────

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

        <div className="flex items-center gap-2">
          {voiceState === 'idle' && (
            <button
              onClick={startRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-opacity hover:opacity-85"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}
              title="Dictá el estado del cliente — la IA razona y propone cambios"
            >
              <Mic className="w-3.5 h-3.5" /> Dictar con IA
            </button>
          )}

          {voiceState === 'recording' && (
            <button onClick={stopRecording}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              <div className="flex items-end gap-px h-3.5">
                {[0.5, 1, 0.7, 0.9, 0.6, 1, 0.4].map((h, i) => (
                  <div key={i} className="w-0.5 rounded-full origin-bottom"
                    style={{ background: '#f87171', height: `${h * 14}px`, animation: `waveBar 0.7s ease-in-out ${i * 0.09}s infinite alternate` }} />
                ))}
              </div>
              <span>{formatSeconds(recordingSeconds)}</span>
              <MicOff className="w-3.5 h-3.5" />
              <span>Detener</span>
            </button>
          )}

          {voiceState === 'processing' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando con IA...
            </div>
          )}

          {voiceState === 'done' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs animate-fade-in"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
              <Sparkles className="w-3.5 h-3.5" /> ¡Listo!
            </div>
          )}

          {voiceState === 'error' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs animate-fade-in"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="w-3.5 h-3.5" /> Error. Intentá de nuevo.
            </div>
          )}
        </div>
      </div>

      {/* Transcript */}
      {aiTranscript && voiceState !== 'recording' && voiceState !== 'processing' && (
        <div className="mx-5 mt-3 p-3 rounded-lg text-xs animate-fade-in"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          <span style={{ color: 'rgba(167,139,250,0.7)', fontWeight: 600 }}>Transcripción: </span>
          {aiTranscript}
        </div>
      )}

      {/* ── Proposals panel (amber) ─────────────────────────────────────── */}
      {pendingProposals.length > 0 && (
        <div className="mx-5 mt-3 rounded-xl overflow-hidden animate-fade-in"
          style={{ border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)' }}>

          <div className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: 'rgba(251,191,36,0.15)', background: 'rgba(251,191,36,0.07)' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
              <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>
                La IA propone cambios — revisá y aprobá
              </span>
              <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                {pendingProposals.length}
              </span>
            </div>
            {pendingProposals.length > 1 && (
              <button
                onClick={applyAllProposals}
                disabled={applyingAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                {applyingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Aplicar todas
              </button>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: 'rgba(251,191,36,0.08)' }}>
            {pendingProposals.map(proposal => {
              const currentAction = proposalActions[proposal.key] ?? proposal.action
              return (
                <div key={proposal.key} className="px-4 py-3 space-y-2">
                  {/* Field label + toggle + dismiss */}
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0" style={{ color: proposal.color }}>{proposal.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: proposal.color }}>{proposal.label}</span>
                        {/* Toggle: replace ↔ append */}
                        <button
                          onClick={() => toggleProposalAction(proposal.key)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border cursor-pointer transition-all"
                          style={currentAction === 'replace'
                            ? { color: '#f87171', background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.25)' }
                            : { color: '#34d399', background: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.25)' }
                          }
                          title="Click para cambiar cómo se aplica el cambio"
                        >
                          {currentAction === 'replace' ? '↺ Reemplazar' : '+ Agregar al final'}
                        </button>
                      </div>
                      <p className="text-xs mt-0.5 italic" style={{ color: 'rgba(255,255,255,0.32)' }}>
                        {proposal.reason}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissProposal(proposal.key)}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Content preview */}
                  <div className="rounded-lg p-2.5 space-y-2"
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {currentAction === 'replace' ? (
                      <>
                        {/* Existing — struck through */}
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans line-through"
                          style={{ color: 'rgba(255,255,255,0.18)', margin: 0 }}>
                          {truncateLines(proposal.existing, 3)}
                        </pre>
                        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                        {/* Proposed replacement */}
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
                          style={{ color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                          {proposal.content}
                        </pre>
                      </>
                    ) : (
                      <>
                        {/* Existing — muted */}
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
                          style={{ color: 'rgba(255,255,255,0.28)', margin: 0 }}>
                          {truncateLines(proposal.existing, 2)}
                        </pre>
                        <div className="border-t" style={{ borderColor: 'rgba(52,211,153,0.15)' }} />
                        {/* New bullets to append */}
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
                          style={{ color: '#34d399', margin: 0 }}>
                          {proposal.content}
                        </pre>
                      </>
                    )}
                  </div>

                  {/* Apply button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => applyProposal(proposal)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-85"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <CheckCircle2 className="w-3 h-3" /> Aplicar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Detected tasks panel (purple) ───────────────────────────────── */}
      {detectedTasks.length > 0 && (
        <div className="mx-5 mt-3 rounded-xl overflow-hidden animate-fade-in"
          style={{ border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.05)' }}>

          <div className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ borderColor: 'rgba(167,139,250,0.15)', background: 'rgba(167,139,250,0.08)' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
              <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>Tareas detectadas</span>
              <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                {detectedTasks.length}
              </span>
            </div>
            {pendingTasks.length > 1 && (
              <button
                onClick={createAllTasks}
                disabled={creatingAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}>
                {creatingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Crear todas ({pendingTasks.length})
              </button>
            )}
          </div>

          <div className="divide-y" style={{ borderColor: 'rgba(167,139,250,0.1)' }}>
            {detectedTasks.map(task => {
              const isCreated  = createdIds.has(task._id)
              const isCreating = creatingId === task._id || creatingAll
              const pc         = PRIORITY_CONFIG[task.priority]

              return (
                <div key={task._id} className="px-4 py-3 space-y-2"
                  style={{ opacity: isCreated ? 0.55 : 1, transition: 'opacity 0.3s' }}>

                  <div className="flex items-start gap-2">
                    <input
                      value={task.title}
                      onChange={e => updateTask(task._id, { title: e.target.value })}
                      disabled={isCreated}
                      className="flex-1 text-sm font-medium outline-none bg-transparent"
                      style={{
                        color: isCreated ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.88)',
                        textDecoration: isCreated ? 'line-through' : 'none',
                      }}
                    />
                    {!isCreated && (
                      <button
                        onClick={() => dismissTask(task._id)}
                        className="shrink-0 w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => !isCreated && updateTask(task._id, { priority: pc.next })}
                      disabled={isCreated}
                      className="flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border cursor-pointer"
                      style={{ color: pc.color, background: `${pc.color}18`, borderColor: `${pc.color}30` }}
                      title="Click para cambiar prioridad"
                    >
                      {pc.label}
                    </button>

                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <input
                        type="date"
                        value={task.due_date}
                        onChange={e => updateTask(task._id, { due_date: e.target.value })}
                        disabled={isCreated}
                        className="text-xs outline-none bg-transparent"
                        style={{
                          color: task.due_date ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
                          colorScheme: 'dark',
                          width: task.due_date ? 'auto' : '75px',
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <User className="w-3 h-3 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <input
                        value={task.assignee}
                        onChange={e => updateTask(task._id, { assignee: e.target.value })}
                        placeholder="Responsable"
                        disabled={isCreated}
                        className="text-xs outline-none bg-transparent truncate"
                        style={{ color: 'rgba(255,255,255,0.5)', minWidth: 0 }}
                      />
                    </div>

                    <div className="ml-auto shrink-0">
                      {isCreated ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#34d399' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Creada
                        </span>
                      ) : (
                        <button
                          onClick={() => createTask(task)}
                          disabled={isCreating || !task.title.trim()}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: 'white' }}>
                          {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          {isCreating ? 'Creando...' : 'Crear tarea'}
                        </button>
                      )}
                    </div>
                  </div>

                  {task.description && !isCreated && (
                    <input
                      value={task.description}
                      onChange={e => updateTask(task._id, { description: e.target.value })}
                      className="w-full text-xs outline-none bg-transparent"
                      style={{ color: 'rgba(255,255,255,0.32)' }}
                      placeholder="Descripción..."
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Brief sections grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {SECTIONS.map(section => (
          <div
            key={section.key}
            className={`rounded-xl overflow-hidden ${section.span === 'full' ? 'md:col-span-2' : ''}`}
            style={{
              background:  'rgba(255,255,255,0.03)',
              border:      '1px solid rgba(255,255,255,0.06)',
              borderLeft:  `3px solid ${section.color}`,
              animation:   popSections.has(section.key) ? 'briefPop 1.4s ease' : 'none',
            }}
          >
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
                color:      'rgba(255,255,255,0.78)',
                padding:    '10px 16px',
                caretColor: section.color,
                minHeight:  '80px',
              }}
            />
          </div>
        ))}
      </div>

      {!hasAnyContent && voiceState === 'idle' && (
        <p className="text-xs text-center pb-3" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Escribí directamente o usá &ldquo;Dictar con IA&rdquo; para hablar y que la IA rellene todo
        </p>
      )}
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.openai_api_key

  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY no configurada' }, { status: 503 })
  }

  try {
    const openai = new OpenAI({ apiKey })

    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const existingBriefRaw = formData.get('existing_brief') as string | null

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })
    }

    // Parse existing brief so the AI can reason about what to do with each field
    let existing: Record<string, string> = {}
    try {
      if (existingBriefRaw) existing = JSON.parse(existingBriefRaw)
    } catch { /* ignore parse errors */ }

    const hasExisting = Object.values(existing).some(v => v?.trim())

    // 1. Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
    })

    const text = transcription.text?.trim()
    if (!text) {
      return NextResponse.json({ error: 'No se detectó voz en el audio' }, { status: 422 })
    }

    // 2. Agent reasoning: GPT-4o-mini extracts brief fields + tasks, reasoning about existing content
    const today = new Date().toISOString().split('T')[0]

    const existingContext = hasExisting
      ? `\n\nCONTENIDO ACTUAL DE LA FICHA (puede estar desactualizado o incompleto):\n${JSON.stringify(existing, null, 2)}`
      : ''

    const briefRule = hasExisting
      ? `Para cada campo de la ficha, razonás como agente: comparás el dictado con el contenido actual y decidís la mejor acción.
- "replace": el dictado trae info nueva que contradice, actualiza o supera la anterior (ej: "ya terminamos X" cuando antes decía "estamos haciendo X")
- "append": el dictado agrega info complementaria sin contradecir lo existente
- "keep": el dictado no menciona ese campo en absoluto, no tocar`
      : `Para cada campo: si el dictado lo menciona, acción "replace" (campo vacío). Si no lo menciona, acción "keep" con content "".`

    const systemPrompt = `Sos un agente inteligente de una agencia de marketing digital argentina. Analizás transcripciones de actualizaciones verbales sobre clientes y razonás sobre qué información extraer y cómo tratarla.${existingContext}

Hoy es ${today}. ${briefRule}

Devolvé ÚNICAMENTE un JSON con esta estructura exacta:

{
  "brief": {
    "last_action":   { "content": "texto propuesto (vacío si keep)", "action": "replace|append|keep", "reason": "una oración explicando tu decisión" },
    "pending_notes": { "content": "texto propuesto (vacío si keep)", "action": "replace|append|keep", "reason": "una oración explicando tu decisión" },
    "next_steps":    { "content": "texto propuesto (vacío si keep)", "action": "replace|append|keep", "reason": "una oración explicando tu decisión" },
    "future_steps":  { "content": "texto propuesto (vacío si keep)", "action": "replace|append|keep", "reason": "una oración explicando tu decisión" },
    "ideas":         { "content": "texto propuesto (vacío si keep)", "action": "replace|append|keep", "reason": "una oración explicando tu decisión" }
  },
  "tasks": [
    {
      "title": "nombre corto y claro de la tarea",
      "description": "detalle opcional de la tarea",
      "priority": "low|medium|high",
      "due_date": "YYYY-MM-DD si se menciona fecha concreta, null si no",
      "assignee": "nombre del responsable si se menciona, vacío si no"
    }
  ]
}

REGLAS PARA TAREAS: Extraé toda acción concreta mencionada (hacer, enviar, preparar, agendar, contactar, revisar, armar, etc.). Prioridad: urgente/hoy/mañana = high, esta semana = medium, sin urgencia = low. Si no hay tareas concretas, devolvé "tasks": [].
REGLAS PARA FICHA: Usá primera persona del plural ("Entregamos...", "Estamos esperando..."). Máximo 3 oraciones por campo. Si action es "keep", content debe ser string vacío.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Transcripción: "${text}"` },
      ],
    })

    const raw    = completion.choices[0].message.content ?? '{}'
    const parsed = JSON.parse(raw)

    const briefRaw = parsed.brief ?? {}
    const tasks    = Array.isArray(parsed.tasks) ? parsed.tasks : []

    const VALID_ACTIONS = ['replace', 'append', 'keep']
    const brief: Record<string, { content: string; action: string; reason: string }> = {}

    for (const key of ['last_action', 'pending_notes', 'next_steps', 'future_steps', 'ideas']) {
      const f = briefRaw[key] ?? {}
      brief[key] = {
        content: String(f.content ?? '').trim(),
        action:  VALID_ACTIONS.includes(String(f.action)) ? String(f.action) : 'keep',
        reason:  String(f.reason ?? ''),
      }
    }

    return NextResponse.json({
      transcript: text,
      brief,
      tasks: tasks
        .map((t: Record<string, unknown>) => ({
          title:       String(t.title       ?? '').trim(),
          description: String(t.description ?? ''),
          priority:    ['low', 'medium', 'high'].includes(String(t.priority)) ? String(t.priority) : 'medium',
          due_date:    t.due_date && t.due_date !== 'null' ? String(t.due_date) : null,
          assignee:    String(t.assignee    ?? ''),
        }))
        .filter((t: { title: string }) => t.title.length > 0),
    })
  } catch (err) {
    console.error('[voice-brief]', err)
    return NextResponse.json({ error: 'Error procesando el audio' }, { status: 500 })
  }
}

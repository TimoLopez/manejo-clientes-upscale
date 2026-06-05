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
      ? `\n\nCONTENIDO ACTUAL DE LA FICHA:\n${
          Object.entries(existing)
            .filter(([, v]) => v?.trim())
            .map(([k, v]) => `[${k}]: ${v}`)
            .join('\n')
        }`
      : ''

    const systemPrompt = `Sos un agente estratégico de una agencia de marketing digital argentina. Analizás transcripciones de actualizaciones verbales sobre clientes y completás una ficha de estado con bullets detallados.${existingContext}

Hoy es ${today}.

━━━ DEFINICIÓN ESTRICTA DE CADA CAMPO (NO mezclar — cada dato va en UN solo campo) ━━━

• last_action → Solo cosas YA COMPLETADAS / entregadas / publicadas. Verbos en pasado: "Entregamos", "Publicamos", "Mandamos", "Cerramos". Si sigue en curso → NO va acá.

• pending_notes → Cosas EN CURSO ahora mismo O ESPERANDO algo (aprobación del cliente, respuesta, asset, pago, reunión). "Estamos esperando", "Está en revisión", "Falta que el cliente". Si ya terminó → NO va acá.

• next_steps → Acciones CONCRETAS a ejecutar en los próximos días / esta semana. Específicas, accionables, con verbo infinitivo: "Agendar call", "Enviar propuesta", "Revisar copy". Planes a largo plazo → NO van acá.

• future_steps → Dirección ESTRATÉGICA a semanas/meses: expansión, nuevas verticales, objetivos de crecimiento. "Explorar", "Evaluar", "Apuntar a". Cosas de la próxima semana → NO van acá.

• ideas → Ideas CREATIVAS o propuestas no comprometidas aún, cosas a explorar o presentar. "Podríamos proponer", "Hay potencial para", "Vale la pena testear". No son tareas concretas.

━━━ REGLA DE ORO ━━━
Si el dictado NO menciona nada para un campo → action "keep", content "". NUNCA inventar ni rellenar por las dudas. Es mejor dejar vacío que meter info incorrecta.

━━━ FORMATO OBLIGATORIO PARA CONTENT ━━━
Bullets usando "• " (bullet unicode + espacio). Un punto concreto por bullet. Sé detallado y completo — no escatimés. Primera persona del plural.
Ejemplo válido: "• Entregamos el calendario de 20 posts para junio\n• Publicamos la campaña de stories de verano\n• Mandamos el reporte mensual de métricas"

━━━ DECISIÓN replace vs append (solo si el campo ya tiene contenido) ━━━
- "replace": el dictado contradice, actualiza o supera lo anterior (ej: "ya terminamos X" cuando antes decía "estamos en X") → reemplazar todo
- "append": el dictado agrega bullets NUEVOS que complementan sin contradecir → agregar al final
- "keep": el dictado no menciona ese campo → no tocar

Devolvé ÚNICAMENTE este JSON:

{
  "brief": {
    "last_action":   { "content": "bullets o vacío", "action": "replace|append|keep", "reason": "una oración clara explicando la decisión" },
    "pending_notes": { "content": "bullets o vacío", "action": "replace|append|keep", "reason": "una oración clara explicando la decisión" },
    "next_steps":    { "content": "bullets o vacío", "action": "replace|append|keep", "reason": "una oración clara explicando la decisión" },
    "future_steps":  { "content": "bullets o vacío", "action": "replace|append|keep", "reason": "una oración clara explicando la decisión" },
    "ideas":         { "content": "bullets o vacío", "action": "replace|append|keep", "reason": "una oración clara explicando la decisión" }
  },
  "tasks": [
    {
      "title": "nombre corto de la tarea",
      "description": "detalle si lo hay",
      "priority": "low|medium|high",
      "due_date": "YYYY-MM-DD si se menciona fecha, null si no",
      "assignee": "nombre si se menciona, vacío si no"
    }
  ]
}

TAREAS: Extraé toda acción concreta mencionada (hacer, enviar, preparar, agendar, contactar, revisar, armar, subir, etc.). Prioridad: urgente/hoy/mañana = high, esta semana = medium, sin urgencia = low. Si no hay tareas → "tasks": []. Las tareas y los next_steps pueden solaparse — eso está bien.`

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

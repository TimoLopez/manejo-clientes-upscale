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

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })
    }

    // 1. Transcribir con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
    })

    const text = transcription.text?.trim()
    if (!text) {
      return NextResponse.json({ error: 'No se detectó voz en el audio' }, { status: 422 })
    }

    // 2. Analizar con GPT-4o-mini: extraer ficha + tareas en un solo call
    const today = new Date().toISOString().split('T')[0]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Sos asistente de una agencia de marketing digital argentina. Analizás transcripciones de actualizaciones verbales sobre clientes y extraés dos cosas: el estado estratégico del cliente (ficha) y las tareas accionables mencionadas.

Hoy es ${today}. Devolvé ÚNICAMENTE un JSON válido con esta estructura exacta:

{
  "brief": {
    "last_action": "lo último que se hizo/entregó (string vacío si no se menciona)",
    "pending_notes": "lo en proceso o esperando respuesta (string vacío si no se menciona)",
    "next_steps": "próximas acciones a corto plazo (string vacío si no se menciona)",
    "future_steps": "planes estratégicos a largo plazo (string vacío si no se menciona)",
    "ideas": "ideas creativas a explorar (string vacío si no se menciona)"
  },
  "tasks": [
    {
      "title": "nombre corto y claro de la tarea",
      "description": "detalle opcional de la tarea",
      "priority": "low|medium|high",
      "due_date": "YYYY-MM-DD si se menciona fecha concreta, null si no",
      "assignee": "nombre del responsable si se menciona, string vacío si no"
    }
  ]
}

REGLAS PARA TAREAS: Extraé toda acción concreta mencionada como algo a hacer, enviar, preparar, agendar, contactar, revisar, etc. Inferí la prioridad según el contexto (urgente/para hoy/mañana = high, esta semana = medium, sin urgencia = low). Si no hay tareas concretas, devolvé "tasks": [].
REGLAS PARA FICHA: Usá primera persona del plural ("Entregamos...", "Estamos esperando..."). Máximo 3 oraciones por campo. String vacío si no se menciona.`,
        },
        {
          role: 'user',
          content: `Transcripción: "${text}"`,
        },
      ],
    })

    const raw  = completion.choices[0].message.content ?? '{}'
    const data = JSON.parse(raw)

    const brief = data.brief ?? {}
    const tasks = Array.isArray(data.tasks) ? data.tasks : []

    return NextResponse.json({
      transcript: text,
      brief: {
        last_action:   String(brief.last_action   ?? ''),
        pending_notes: String(brief.pending_notes ?? ''),
        next_steps:    String(brief.next_steps    ?? ''),
        future_steps:  String(brief.future_steps  ?? ''),
        ideas:         String(brief.ideas         ?? ''),
      },
      tasks: tasks.map((t: Record<string, unknown>) => ({
        title:       String(t.title       ?? '').trim(),
        description: String(t.description ?? ''),
        priority:    ['low', 'medium', 'high'].includes(String(t.priority)) ? t.priority : 'medium',
        due_date:    t.due_date && t.due_date !== 'null' ? String(t.due_date) : null,
        assignee:    String(t.assignee    ?? ''),
      })).filter((t: { title: string }) => t.title.length > 0),
    })
  } catch (err) {
    console.error('[voice-brief]', err)
    return NextResponse.json({ error: 'Error procesando el audio' }, { status: 500 })
  }
}

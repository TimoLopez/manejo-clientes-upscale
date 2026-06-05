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

    // 2. Analizar con GPT-4o-mini y extraer los 5 campos de la ficha
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Sos asistente de una agencia de marketing digital argentina. Analizás transcripciones de actualizaciones verbales sobre clientes y extraés información para rellenar la ficha del cliente.

Devolvé ÚNICAMENTE un JSON válido con estos campos (string vacío si no se menciona):
- last_action: lo último que se hizo, entregó o completó para el cliente
- pending_notes: lo que está actualmente en proceso, pendiente o esperando respuesta del cliente
- next_steps: acciones concretas a realizar a corto plazo (próximos días o semana)
- future_steps: planes estratégicos y objetivos a largo plazo
- ideas: ideas creativas o propuestas a explorar con el cliente

Usá redacción directa, en primera persona del plural (ej: "Entregamos...", "Estamos esperando...", "Agendar...", "Explorar..."). Máximo 3 oraciones por campo.`,
        },
        {
          role: 'user',
          content: `Transcripción: "${text}"`,
        },
      ],
    })

    const raw = completion.choices[0].message.content ?? '{}'
    const brief = JSON.parse(raw)

    return NextResponse.json({
      transcript: text,
      brief: {
        last_action:    String(brief.last_action    ?? ''),
        pending_notes:  String(brief.pending_notes  ?? ''),
        next_steps:     String(brief.next_steps     ?? ''),
        future_steps:   String(brief.future_steps   ?? ''),
        ideas:          String(brief.ideas          ?? ''),
      },
    })
  } catch (err) {
    console.error('[voice-brief]', err)
    return NextResponse.json({ error: 'Error procesando el audio' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPTS = {
  edit: `You are an expert design assistant inside Subsrf Canvas, a professional design tool.
You help designers edit canvas elements by interpreting natural language instructions.
When given a selected element and an instruction, respond with:
1. A brief confirmation of what you're changing
2. A JSON object under the key "updates" with the exact property changes needed
3. Only include properties that actually need to change

Token names should be referenced when values match. Keep responses concise and actionable.`,

  generate: `You are an expert UI designer inside Subsrf Canvas.
You generate complete UI screens and components from text descriptions.
When given a prompt and token set, respond with:
1. A brief description of what you're generating
2. A JSON array under the key "nodes" containing canvas node objects matching this schema:
   { id, name, type, x, y, width, height, opacity, visible, locked, fills, strokes, shadows, cornerRadius, autoLayout, typography, characters, children }
Always use token values from the provided token set. Follow the Subsrf design system: dark backgrounds, neon green (#00FF87) accent, Manrope + Azeret Mono fonts, 4px grid.`,

  critique: `You are a senior design critic and accessibility expert.
Analyse the provided design element for:
- Visual hierarchy and composition
- Accessibility (WCAG compliance, contrast, touch targets)
- Consistency with the design system
- UX patterns and usability issues
Respond with:
1. A structured critique as plain text
2. A JSON array under "annotations" with: [{ nodeId, x, y, severity ("critical"|"warning"|"info"), category, message, suggestion, autoFixable }]`,

  query: `You are a knowledgeable design and development assistant inside Subsrf Canvas.
You have access to the user's canvas data, selected elements, and token set.
Answer questions about the design clearly and concisely. Reference specific values from the data provided.
Keep answers under 150 words unless more detail is genuinely needed.`,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode = 'edit', prompt, selectedNode, tokenSet, framework } = body

    if (!prompt) return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })

    const systemPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] ?? SYSTEM_PROMPTS.query

    const userContent = `
${selectedNode ? `SELECTED ELEMENT:\n${JSON.stringify(selectedNode, null, 2)}\n` : ''}
${tokenSet?.length ? `DESIGN TOKENS (first 20):\n${tokenSet.slice(0,20).map((t: any) => `${t.name}: ${t.value}`).join('\n')}\n` : ''}
FRAMEWORK: ${framework ?? 'react-tailwind'}

USER REQUEST: ${prompt}
`.trim()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    let nodes: any[] = []
    let updates: any = null
    let annotations: any[] = []

    const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) ?? rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0])
        if (mode === 'generate' && parsed.nodes) nodes = parsed.nodes
        if (mode === 'edit' && parsed.updates) updates = parsed.updates
        if (mode === 'critique' && parsed.annotations) annotations = parsed.annotations
      } catch {}
    }

    const displayText = rawText.replace(/```json[\s\S]*?```/g, '').replace(/\{[\s\S]*"nodes"[\s\S]*\}/g, '').trim()

    return NextResponse.json({
      content: displayText || 'Done.',
      nodes: mode === 'generate' ? nodes : undefined,
      updates: mode === 'edit' ? updates : undefined,
      annotations: mode === 'critique' ? annotations : undefined,
    })

  } catch (err: any) {
    console.error('AI canvas error:', err)
    return NextResponse.json({ error: err.message ?? 'AI request failed' }, { status: 500 })
  }
}

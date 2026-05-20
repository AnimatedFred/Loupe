import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const MODEL = 'gemini-2.5-flash'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const BASE_SYSTEM_PROMPT = `You are an expert React developer building apps inside a live Sandpack preview.

Rules:
- Use React 18 + TypeScript for all components
- Use Tailwind CSS for ALL styling — no inline styles, no separate CSS files
- Functional components only, no class components
- Entry point is /src/App.tsx — always keep it working
- Put all components in /src/ directory
- Write complete, runnable files every time — never use placeholder comments like "// rest of code here"
- When updating a file, rewrite the entire file content
- Tailwind CDN is already loaded in index.html — all Tailwind classes work out of the box
- CSS custom properties from the canvas design tokens are available: var(--color-void), var(--color-neon), var(--color-t1), var(--color-deep), var(--color-surface), etc. Use them for brand colors
- After creating major components, call sync_canvas to create matching canvas nodes so the user can edit the design visually`

function buildSystemPrompt(canvasContext?: string): string {
  if (!canvasContext) return BASE_SYSTEM_PROMPT
  return `${BASE_SYSTEM_PROMPT}

[Canvas Design Context]
${canvasContext}

Match the layout, dimensions, typography, and colors from this canvas design when building components. Use the exact names, sizes and colors described above.`
}

// ── Tool declarations (Gemini format) ─────────────────────────────────────

const FUNCTION_DECLARATIONS = [
  {
    name: 'write_file',
    description: 'Write or overwrite a file with new content. Use this to create or update any file in the project.',
    parameters: {
      type: 'object',
      properties: {
        path:    { type: 'string', description: 'File path, e.g. /src/App.tsx' },
        content: { type: 'string', description: 'Complete file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the current content of a file.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'List all files currently in the project.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the project.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to delete' },
      },
      required: ['path'],
    },
  },
  {
    name: 'sync_canvas',
    description: 'Sync the visual canvas to reflect the generated components. Call this after creating major components so the user can see and edit them visually on the infinite canvas.',
    parameters: {
      type: 'object',
      properties: {
        components: {
          type: 'array',
          description: 'Component tree to create as canvas nodes',
          items: {
            type: 'object',
            properties: {
              name:         { type: 'string', description: 'Component name, e.g. "LoginForm"' },
              file:         { type: 'string', description: 'Source file, e.g. "src/components/LoginForm.tsx"' },
              x:            { type: 'number', description: 'Canvas X position' },
              y:            { type: 'number', description: 'Canvas Y position' },
              width:        { type: 'number' },
              height:       { type: 'number' },
              fillColor:    { type: 'string', description: 'Hex fill color, e.g. "#111118"' },
              cornerRadius: { type: 'number' },
              type:         { type: 'string', description: 'frame | text | rect' },
              text:         { type: 'string' },
              textColor:    { type: 'string' },
              fontSize:     { type: 'number' },
              children:     { type: 'array', items: { type: 'object' } },
            },
            required: ['name', 'file', 'width', 'height', 'type'],
          },
        },
      },
      required: ['components'],
    },
  },
]

function enc(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { messages: history, files, canvasContext } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    files: Record<string, string>
    canvasContext?: string
  }

  const currentFiles: Record<string, string> = { ...files }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(new TextEncoder().encode(enc(obj)))

      try {
        const model = genAI.getGenerativeModel({
          model: MODEL,
          systemInstruction: buildSystemPrompt(canvasContext),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }] as any,
          generationConfig: { maxOutputTokens: 8192 },
        })

        // Convert message history to Gemini format.
        // history = [...previous turns, new user message at the end]
        const geminiHistory = history
          .slice(0, -1)
          .filter(m => m.content)
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user' as const,
            parts: [{ text: m.content }],
          }))

        const newUserMessage = history[history.length - 1]?.content ?? ''

        const chat = model.startChat({ history: geminiHistory })

        // ReAct loop: stream → collect function calls → execute → repeat
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type Payload = string | any[]
        let nextPayload: Payload = newUserMessage

        while (true) {
          const result = await chat.sendMessageStream(nextPayload)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const functionCalls: Array<{ name: string; args: Record<string, any> }> = []

          for await (const chunk of result.stream) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parts: any[] = chunk.candidates?.[0]?.content?.parts ?? []
            for (const part of parts) {
              if (part.text) {
                send({ type: 'text', content: part.text })
              }
              if (part.functionCall) {
                functionCalls.push(part.functionCall)
                send({ type: 'tool', name: part.functionCall.name, path: part.functionCall.args?.path ?? null })
              }
            }
          }

          // Gemini sometimes puts function calls only in the final response
          const finalResponse = await result.response
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const finalParts: any[] = finalResponse.candidates?.[0]?.content?.parts ?? []
          for (const part of finalParts) {
            if (part.functionCall && !functionCalls.some(fc => fc.name === part.functionCall.name)) {
              functionCalls.push(part.functionCall)
              send({ type: 'tool', name: part.functionCall.name, path: part.functionCall.args?.path ?? null })
            }
          }

          if (functionCalls.length === 0) break

          // Execute tools and build function response parts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const functionResponses: any[] = []

          for (const call of functionCalls) {
            const args = call.args as Record<string, string>
            let toolResult = ''

            if (call.name === 'write_file') {
              currentFiles[args.path] = args.content
              toolResult = 'ok'
              send({ type: 'file', path: args.path, content: args.content })
            } else if (call.name === 'read_file') {
              toolResult = currentFiles[args.path] ?? `Error: file not found: ${args.path}`
            } else if (call.name === 'list_files') {
              toolResult = JSON.stringify(Object.keys(currentFiles))
            } else if (call.name === 'delete_file') {
              delete currentFiles[args.path]
              toolResult = 'ok'
              send({ type: 'delete', path: args.path })
            } else if (call.name === 'sync_canvas') {
              toolResult = 'ok'
              send({ type: 'canvas_sync', components: call.args.components })
            }

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { result: toolResult },
              },
            })
          }

          nextPayload = functionResponses
        }

        send({ type: 'done' })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        send({ type: 'error', message: msg })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

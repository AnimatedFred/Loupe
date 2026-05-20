'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useAppStore, type StudioMessage, type ToolCall } from '@/stores/app.store'
import { useCanvasStore } from '@/stores/canvas.store'
import type { CodeComponent } from '@/stores/canvas.store'

interface StudioChatProps {
  canvasContext?: string
}

export function StudioChat({ canvasContext }: StudioChatProps) {
  const { messages, agentRunning, addMessage, updateLastMessage, setAgentRunning, writeFile } = useAppStore()
  const createNodesFromCode = useCanvasStore(s => s.createNodesFromCode)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const contextInjectedRef = useRef(false)

  // Reset injection flag when canvas context changes (new studio session)
  useEffect(() => {
    contextInjectedRef.current = false
  }, [canvasContext])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || agentRunning) return

    setInput('')
    addMessage({ role: 'user', content: text })
    setAgentRunning(true)

    // Seed empty assistant message
    addMessage({ role: 'assistant', content: '', toolCalls: [] })

    try {
      const { files, messages: currentMessages } = useAppStore.getState()

      const history = currentMessages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content,
      }))

      // Inject canvas context on first message of this session
      const shouldInjectContext = canvasContext && !contextInjectedRef.current
      if (shouldInjectContext) contextInjectedRef.current = true

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          files,
          canvasContext: shouldInjectContext ? canvasContext : undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let textBuffer = ''
      let toolCallsBuffer: ToolCall[] = []
      let chunk = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunk += decoder.decode(value, { stream: true })

        const lines = chunk.split('\n')
        chunk = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'text') {
              textBuffer += event.content
              updateLastMessage({ content: textBuffer, toolCalls: toolCallsBuffer })
            } else if (event.type === 'tool') {
              toolCallsBuffer = [...toolCallsBuffer, { name: event.name, path: event.path }]
              updateLastMessage({ content: textBuffer, toolCalls: toolCallsBuffer })
            } else if (event.type === 'file') {
              writeFile(event.path, event.content)
            } else if (event.type === 'canvas_sync') {
              createNodesFromCode(event.components as CodeComponent[])
            } else if (event.type === 'delete') {
              useAppStore.getState().deleteFile(event.path)
            } else if (event.type === 'error') {
              textBuffer += `\n\n⚠ ${event.message}`
              updateLastMessage({ content: textBuffer })
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      updateLastMessage({ content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setAgentRunning(false)
    }
  }, [input, agentRunning, canvasContext, addMessage, updateLastMessage, setAgentRunning, writeFile])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <aside className="w-[340px] flex-shrink-0 bg-deep border-r border-white/[0.06] flex flex-col overflow-hidden">
      <div className="h-9 flex items-center px-3 border-b border-white/[0.06] flex-shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-white/30">AI Studio</span>
        {agentRunning && (
          <span className="ml-2 font-mono text-[8px] text-neon animate-pulse">thinking…</span>
        )}
      </div>

      {/* Canvas context badge */}
      {canvasContext && (
        <div className="mx-3 mt-3 px-2.5 py-2 rounded-lg bg-neon/[0.04] border border-neon/10 flex items-start gap-2">
          <span className="text-neon/50 text-[10px] mt-0.5">◈</span>
          <div>
            <p className="font-mono text-[9px] text-neon/60 uppercase tracking-[0.8px]">From canvas</p>
            <p className="font-mono text-[10px] text-white/30 mt-0.5 leading-relaxed">
              {canvasContext.split('\n')[0]}
            </p>
          </div>
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="font-mono text-[11px] text-white/20">
              {canvasContext
                ? 'Ask AI to build this design as React code.'
                : 'Describe what you want to build.'}
            </p>
            <p className="font-mono text-[10px] text-white/10 mt-1">⌘+Enter to send</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={canvasContext ? 'Build this as a React component…' : 'Add a dark login form…'}
            disabled={agentRunning}
            rows={3}
            className="w-full bg-layer border border-white/[0.08] rounded-lg px-3 py-2.5 font-mono text-[12px] text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-neon/30 transition-colors disabled:opacity-40"
          />
          <button
            onClick={sendMessage}
            disabled={agentRunning || !input.trim()}
            className="absolute bottom-2 right-2 px-3 h-7 rounded font-mono text-[9px] uppercase tracking-[0.8px] bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {agentRunning ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </aside>
  )
}

function MessageBubble({ msg }: { msg: StudioMessage }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-white/[0.06] text-white/70'
            : 'bg-neon/[0.05] text-white/80 border border-neon/10'
        }`}
      >
        {msg.content || (msg.role === 'assistant' && <span className="text-neon/50 animate-pulse">▋</span>)}
      </div>
      {msg.toolCalls && msg.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-[90%]">
          {msg.toolCalls.map((tc, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[9px] bg-white/[0.04] text-white/30 border border-white/[0.06]"
            >
              <span className="text-neon/50">{toolIcon(tc.name)}</span>
              {tc.path ?? tc.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function toolIcon(name: string): string {
  if (name === 'write_file') return '✎'
  if (name === 'read_file') return '◎'
  if (name === 'delete_file') return '✕'
  if (name === 'list_files') return '≡'
  return '⚙'
}

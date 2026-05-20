'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'
import {
  colorToHex, colorToRgba, contrastRatio, passesWCAGAA,
  generateNodeCode, generateSubsurfaceData, colorMatchesToken,
  spacingMatchesToken, fontSizeMatchesToken, toPascalCase,
} from '@/lib/utils'
import type { CanvasNode, AIMessage, ConstraintViolation } from '@/types'
import { nanoid } from 'nanoid'

// ── Shared primitives ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] uppercase tracking-[2px] text-white/25 mb-2">
      {children}
    </div>
  )
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="font-mono text-[10px] text-white/30 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

function PropVal({ children, token, onClick }: { children: React.ReactNode; token?: string; onClick?: () => void }) {
  return (
    <div
      className={`flex items-center gap-1.5 bg-layer border border-white/[0.07] rounded px-2 py-[3px] font-mono text-[10px] text-t1 ${onClick ? 'cursor-pointer hover:border-white/15' : ''}`}
      onClick={onClick}
    >
      {children}
      {token && <span className="text-neon/60 text-[8px]">{token}</span>}
    </div>
  )
}

function ColorDot({ color }: { color: import('@/types').Color }) {
  return (
    <div
      className="w-3 h-3 rounded-[2px] flex-shrink-0 border border-white/15"
      style={{ background: colorToRgba(color) }}
    />
  )
}

function Divider() {
  return <div className="border-t border-white/[0.06] my-3" />
}

// ── Design tab ────────────────────────────────────────────────────────────

function DesignTab() {
  const { selectedNodeIds, activePage, updateNode, file } = useCanvasStore()
  const tokens = file?.tokenSet.tokens ?? []

  const node = selectedNodeIds.length === 1
    ? activePage?.nodes.find(n => n.id === selectedNodeIds[0]) ?? null
    : null

  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="font-mono text-[9px] text-white/20 text-center leading-relaxed">
          Select an element<br />to edit its properties
        </p>
      </div>
    )
  }

  const fill = node.fills?.[0]
  const stroke = node.strokes?.[0]
  const shadow = node.shadows?.[0]
  const al = node.autoLayout

  function updateFillColor(hex: string) {
    const r = parseInt(hex.slice(1,3),16)/255
    const g = parseInt(hex.slice(3,5),16)/255
    const b = parseInt(hex.slice(5,7),16)/255
    updateNode(node.id, { fills: [{ type:'SOLID', color:{r,g,b,a:1} }] })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Element info */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 bg-blue/10 border border-blue/20 rounded flex items-center justify-center text-[9px] text-blue">
            {node.type === 'TEXT' ? 'T' : node.type === 'COMPONENT' ? '◈' : '⬚'}
          </div>
          <div>
            <div className="font-medium text-[11px] text-t1">{node.name}</div>
            <div className="font-mono text-[9px] text-white/30">{node.type} · {Math.round(node.width)}×{Math.round(node.height)}px</div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="p-3 border-b border-white/[0.06]">
        <SectionLabel>Layout</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {[
            { label:'X', val: Math.round(node.x),      key:'x' },
            { label:'Y', val: Math.round(node.y),      key:'y' },
            { label:'W', val: Math.round(node.width),  key:'width' },
            { label:'H', val: Math.round(node.height), key:'height' },
          ].map(({ label, val, key }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="font-mono text-[9px] text-white/30 w-4">{label}</span>
              <input
                type="number"
                value={val}
                onChange={e => updateNode(node.id, { [key]: Number(e.target.value) })}
                className="flex-1 bg-layer border border-white/[0.07] rounded px-2 py-1 font-mono text-[10px] text-t1 outline-none focus:border-neon/30 w-full"
              />
            </div>
          ))}
        </div>

        {node.cornerRadius !== undefined && (
          <PropRow label="Radius">
            <PropVal token={tokens.find(t => t.value === `${node.cornerRadius}px`)?.name}>
              <input
                type="number"
                value={node.cornerRadius}
                onChange={e => updateNode(node.id, { cornerRadius: Number(e.target.value) })}
                className="bg-transparent outline-none w-12 text-right text-[10px]"
              />
              px
            </PropVal>
          </PropRow>
        )}

        <PropRow label="Opacity">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range" min={0} max={1} step={0.01}
              value={node.opacity}
              onChange={e => updateNode(node.id, { opacity: Number(e.target.value) })}
              className="flex-1 h-1 accent-neon"
            />
            <span className="font-mono text-[10px] text-white/50 w-8 text-right">
              {Math.round(node.opacity * 100)}%
            </span>
          </div>
        </PropRow>
      </div>

      {/* Fill */}
      {fill && (
        <div className="p-3 border-b border-white/[0.06]">
          <SectionLabel>Fill</SectionLabel>
          {fill.type === 'SOLID' && fill.color && (
            <PropRow label="Color">
              <PropVal token={colorMatchesToken(fill.color, tokens) ?? undefined}>
                <ColorDot color={fill.color} />
                <input
                  type="color"
                  value={colorToHex(fill.color)}
                  onChange={e => updateFillColor(e.target.value)}
                  className="sr-only"
                  id={`fill-color-${node.id}`}
                />
                <label htmlFor={`fill-color-${node.id}`} className="cursor-pointer">
                  {colorToHex(fill.color).toUpperCase()}
                </label>
              </PropVal>
            </PropRow>
          )}
        </div>
      )}

      {/* Stroke */}
      {stroke && (
        <div className="p-3 border-b border-white/[0.06]">
          <SectionLabel>Stroke</SectionLabel>
          <PropRow label="Color">
            <PropVal>
              <ColorDot color={stroke.color} />
              {colorToHex(stroke.color).toUpperCase()}
            </PropVal>
          </PropRow>
          <PropRow label="Weight">
            <PropVal>{stroke.weight}px</PropVal>
          </PropRow>
        </div>
      )}

      {/* Shadow */}
      {shadow && (
        <div className="p-3 border-b border-white/[0.06]">
          <SectionLabel>Shadow</SectionLabel>
          <div className="font-mono text-[9px] text-white/40 bg-layer border border-white/[0.07] rounded p-2">
            {shadow.offsetX}px {shadow.offsetY}px {shadow.blur}px {shadow.spread}px
            <br />{colorToRgba(shadow.color)}
          </div>
        </div>
      )}

      {/* Auto layout */}
      {al && al.mode !== 'NONE' && (
        <div className="p-3 border-b border-white/[0.06]">
          <SectionLabel>Auto Layout</SectionLabel>
          <PropRow label="Direction">
            <div className="flex gap-1">
              {(['HORIZONTAL','VERTICAL'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => updateNode(node.id, { autoLayout: { ...al, mode: m } })}
                  className={`px-2 py-0.5 rounded font-mono text-[9px] transition-all ${
                    al.mode === m ? 'bg-neon/10 text-neon border border-neon/20' : 'text-white/30 border border-white/[0.07] hover:text-white/50'
                  }`}
                >
                  {m === 'HORIZONTAL' ? '→' : '↓'}
                </button>
              ))}
            </div>
          </PropRow>
          <PropRow label="Gap">
            <PropVal token={spacingMatchesToken(al.gap, tokens) ?? undefined}>
              <input
                type="number"
                value={al.gap}
                onChange={e => updateNode(node.id, { autoLayout: { ...al, gap: Number(e.target.value) } })}
                className="bg-transparent outline-none w-10 text-right"
              />
              px
            </PropVal>
          </PropRow>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'T', key: 'paddingTop',    val: al.paddingTop },
              { label: 'R', key: 'paddingRight',  val: al.paddingRight },
              { label: 'B', key: 'paddingBottom', val: al.paddingBottom },
              { label: 'L', key: 'paddingLeft',   val: al.paddingLeft },
            ].map(({ label, key, val }) => (
              <div key={key} className="flex items-center gap-1">
                <span className="font-mono text-[9px] text-white/25 w-4">{label}</span>
                <input
                  type="number"
                  value={val}
                  onChange={e => updateNode(node.id, { autoLayout: { ...al, [key]: Number(e.target.value) } })}
                  className="flex-1 bg-layer border border-white/[0.07] rounded px-1 py-1 font-mono text-[10px] text-t1 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typography */}
      {node.type === 'TEXT' && node.typography && (
        <div className="p-3 border-b border-white/[0.06]">
          <SectionLabel>Typography</SectionLabel>
          <PropRow label="Family">
            <PropVal>{node.typography.fontFamily.split(',')[0]}</PropVal>
          </PropRow>
          <PropRow label="Size">
            <PropVal token={fontSizeMatchesToken(node.typography.fontSize, tokens) ?? undefined}>
              <input
                type="number"
                value={node.typography.fontSize}
                onChange={e => updateNode(node.id, { typography: { ...node.typography!, fontSize: Number(e.target.value) } })}
                className="bg-transparent outline-none w-10 text-right"
              />
              px
            </PropVal>
          </PropRow>
          <PropRow label="Weight">
            <PropVal>{node.typography.fontWeight}</PropVal>
          </PropRow>
          <PropRow label="Leading">
            <PropVal>{node.typography.lineHeight}</PropVal>
          </PropRow>
          <PropRow label="Color">
            <PropVal token={colorMatchesToken(node.typography.color, tokens) ?? undefined}>
              <ColorDot color={node.typography.color} />
              {colorToHex(node.typography.color).toUpperCase()}
            </PropVal>
          </PropRow>
        </div>
      )}

      {/* Intent tag */}
      <div className="p-3">
        <SectionLabel>Intent</SectionLabel>
        <div className="flex flex-wrap gap-1">
          {['PRIMARY_CTA','SECONDARY_ACTION','DECORATIVE','NAVIGATION','DATA_DISPLAY','EMPTY_STATE','ERROR_STATE'].map(intent => (
            <button
              key={intent}
              onClick={() => updateNode(node.id, { intentTag: { type: intent as any } })}
              className={`px-2 py-0.5 rounded font-mono text-[8px] transition-all ${
                node.intentTag?.type === intent
                  ? 'bg-neon/10 text-neon border border-neon/20'
                  : 'text-white/25 border border-white/[0.07] hover:text-white/40'
              }`}
            >
              {intent.replace(/_/g,' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Subsurface tab ────────────────────────────────────────────────────────

function SubsurfaceTab() {
  const { selectedNodeIds, activePage, file } = useCanvasStore()
  const tokens = file?.tokenSet.tokens ?? []
  const [copied, setCopied] = useState<string | null>(null)

  const node = selectedNodeIds.length === 1
    ? activePage?.nodes.find(n => n.id === selectedNodeIds[0]) ?? null
    : null

  if (!node) return (
    <div className="flex-1 flex items-center justify-center p-4">
      <p className="font-mono text-[9px] text-white/20 text-center">Select an element</p>
    </div>
  )

  const sub = generateSubsurfaceData(node, tokens)

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1400)
  }

  const fill = node.fills?.[0]
  const contrastVal = node.type === 'TEXT' && node.typography
    ? contrastRatio(node.typography.color, fill?.color ?? { r:0.02,g:0.02,b:0.03,a:1 })
    : null

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Element summary */}
      <div className="bg-layer border border-white/[0.07] rounded-lg overflow-hidden mb-3">
        <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-white/[0.06]">
          <span className="font-mono text-[9px] uppercase tracking-[1.5px] text-neon">Subsurface · {node.name}</span>
          <button
            className="font-mono text-[8px] text-white/30 hover:text-neon transition-colors"
            onClick={() => copy(JSON.stringify(sub, null, 2), 'all')}
          >
            {copied === 'all' ? '✓ copied' : '⎘ copy all'}
          </button>
        </div>

        <div className="p-3 font-mono text-[9.5px] leading-[1.85] text-white/50 space-y-0.5">
          <div><span className="text-neon/70">component</span>: <span className="text-t1">{node.name}</span></div>
          <div><span className="text-neon/70">type</span>: <span className="text-t1">{node.type}</span></div>
          <div><span className="text-neon/70">size</span>: <span className="text-t1">{Math.round(node.width)}×{Math.round(node.height)}px</span></div>
          <br />

          {Object.keys(sub.tokenRefs ?? {}).length > 0 && (
            <>
              <div className="text-white/25">— tokens —</div>
              {Object.entries(sub.tokenRefs ?? {}).map(([prop, tok]) => (
                <div key={prop}>
                  <span className="text-neon/70">{prop}</span>{' → '}
                  <span className="text-neon/45">{tok}</span>
                </div>
              ))}
              <br />
            </>
          )}

          <div
            className="cursor-pointer hover:text-white/80 transition-colors"
            onClick={() => copy(sub.cssSelector ?? '', 'css')}
          >
            <span className="text-neon/70">selector</span>:{' '}
            <span className="text-t1">{sub.cssSelector}</span>
            {copied === 'css' && <span className="text-neon ml-1">✓</span>}
          </div>
          <div
            className="cursor-pointer hover:text-white/80 transition-colors"
            onClick={() => copy(sub.xpath ?? '', 'xpath')}
          >
            <span className="text-neon/70">xpath</span>:{' '}
            <span className="text-t1 text-[8px]">{sub.xpath}</span>
            {copied === 'xpath' && <span className="text-neon ml-1">✓</span>}
          </div>
        </div>
      </div>

      {/* Contrast */}
      {contrastVal !== null && (
        <div className="mb-3">
          <SectionLabel>Accessibility</SectionLabel>
          <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
            contrastVal >= 4.5 ? 'bg-ok/5 border-ok/20' : 'bg-err/5 border-err/20'
          }`}>
            <div>
              <div className="font-mono text-[10px] text-t1">{contrastVal.toFixed(1)}:1 contrast</div>
              <div className={`font-mono text-[8px] mt-0.5 ${contrastVal >= 4.5 ? 'text-ok' : 'text-err'}`}>
                WCAG AA {contrastVal >= 4.5 ? '✓ pass' : '✗ fail'}
                {contrastVal >= 7 ? ' · AAA ✓' : ''}
              </div>
            </div>
            {contrastVal < 4.5 && (
              <button className="font-mono text-[9px] text-neon bg-neon/10 border border-neon/20 rounded px-2 py-1">
                Fix (1 credit)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Props */}
      {node.subsurface?.props && node.subsurface.props.length > 0 && (
        <div className="mb-3">
          <SectionLabel>Props</SectionLabel>
          <div className="bg-layer border border-white/[0.07] rounded-lg p-3 font-mono text-[9.5px] space-y-0.5">
            {node.subsurface.props.map(p => (
              <div key={p.name}>
                <span className="text-neon/70">{p.name}</span>
                <span className="text-white/25">{p.required ? '' : '?'}</span>
                {': '}
                <span className="text-white/60">{p.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data bindings */}
      {node.dataBindings && Object.keys(node.dataBindings).length > 0 && (
        <div>
          <SectionLabel>Data bindings</SectionLabel>
          <div className="bg-layer border border-white/[0.07] rounded-lg p-3 font-mono text-[9px] space-y-1">
            {Object.entries(node.dataBindings).map(([field, binding]) => (
              <div key={field} className="flex items-center gap-1">
                <span className="text-neon/60">{`{${field}}`}</span>
                <span className="text-white/25">→</span>
                <span className="text-white/50">{binding.field}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Code tab ──────────────────────────────────────────────────────────────

function CodeTab() {
  const { selectedNodeIds, activePage, file, generatedCode } = useCanvasStore()
  const [activeView, setActiveView] = useState<'jsx'|'css'|'props'>('jsx')
  const [copied, setCopied] = useState(false)
  const tokens = file?.tokenSet.tokens ?? []
  const framework = file?.framework ?? 'react-tailwind'

  const node = selectedNodeIds.length === 1
    ? activePage?.nodes.find(n => n.id === selectedNodeIds[0]) ?? null
    : null

  const code = node ? generateNodeCode(node, tokens, framework) : null
  const displayCode = activeView === 'jsx' ? code?.jsx : activeView === 'css' ? code?.css : code?.props

  function copy() {
    if (!displayCode) return
    navigator.clipboard.writeText(displayCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!node) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="font-mono text-[9px] text-white/20">Select an element</p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* View switcher */}
      <div className="flex border-b border-white/[0.06] flex-shrink-0">
        {(['jsx','css','props'] as const).map(v => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`flex-1 py-2 font-mono text-[8px] uppercase tracking-[1px] transition-all ${
              activeView === v ? 'text-neon border-b-2 border-neon' : 'text-white/25 hover:text-white/40'
            }`}
          >
            {v === 'jsx' ? framework.includes('react') ? 'TSX' : 'HTML' : v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 py-1.5 bg-layer border-b border-white/[0.06] flex-shrink-0">
          <span className="font-mono text-[8px] uppercase tracking-[1px] text-white/25">
            {framework} · {toPascalCase(node.name)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="font-mono text-[8px] text-neon/60 hover:text-neon transition-colors"
            >
              {copied ? '✓ copied' : '⎘ copy'}
            </button>
            <button
              className="font-mono text-[8px] text-white/25 hover:text-white/50 transition-colors"
              onClick={() => useCanvasStore.getState().setActiveRightPanel('push')}
            >
              ↑ push
            </button>
          </div>
        </div>

        <pre
          className="flex-1 overflow-auto p-3 font-mono text-[9.5px] leading-[1.85] text-white/55 bg-void whitespace-pre-wrap break-words"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
        >
          {displayCode ?? '// No code generated yet'}
        </pre>
      </div>

      {/* Framework selector */}
      <div className="p-2 border-t border-white/[0.06] flex-shrink-0">
        <SectionLabel>Framework</SectionLabel>
        <div className="flex gap-1 flex-wrap">
          {(['react-tailwind','react-css','vue-tailwind','html-css'] as const).map(fw => (
            <button
              key={fw}
              onClick={() => useCanvasStore.getState().updateFile({ framework: fw })}
              className={`px-2 py-0.5 rounded font-mono text-[8px] transition-all ${
                framework === fw
                  ? 'bg-neon/10 text-neon border border-neon/20'
                  : 'text-white/25 border border-white/[0.07] hover:text-white/40'
              }`}
            >
              {fw}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── AI tab ────────────────────────────────────────────────────────────────

function AITab() {
  const { aiMessages, aiLoading, selectedNodeIds, activePage, file, credits, addAIMessage, setAILoading, deductCredits, addGenerationJob, updateGenerationJob, addNode } = useCanvasStore()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'generate'|'edit'|'critique'|'query'>('edit')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const tokens = file?.tokenSet.tokens ?? []

  const node = selectedNodeIds.length === 1
    ? activePage?.nodes.find(n => n.id === selectedNodeIds[0]) ?? null
    : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  const creditCosts = { generate: 5, edit: 1, critique: 2, query: 1 }

  async function send() {
    if (!input.trim() || aiLoading) return
    const cost = creditCosts[mode]
    if (credits < cost) {
      addAIMessage({ id: nanoid(), role: 'assistant', content: `⚠ Insufficient credits. ${mode} costs ${cost} credits (you have ${credits}).`, timestamp: new Date().toISOString() })
      return
    }

    const userMsg: AIMessage = { id: nanoid(), role: 'user', content: input, timestamp: new Date().toISOString() }
    addAIMessage(userMsg)
    setInput('')
    setAILoading(true)
    deductCredits(cost)

    // Build context for the API call
    const context = {
      mode,
      prompt: input,
      selectedNode: node ? { name: node.name, type: node.type, width: node.width, height: node.height, fills: node.fills, typography: node.typography } : null,
      tokenSet: tokens.slice(0, 30).map(t => ({ name: t.name, value: t.value })),
      framework: file?.framework ?? 'react-tailwind',
    }

    try {
      const res = await fetch('/api/ai/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      })
      const data = await res.json()

      const assistantMsg: AIMessage = {
        id: nanoid(),
        role: 'assistant',
        content: data.content ?? 'Generation complete.',
        timestamp: new Date().toISOString(),
        creditsUsed: cost,
        action: data.action,
      }
      addAIMessage(assistantMsg)

      // If generation returned nodes, add them to canvas
      if (data.nodes && mode === 'generate') {
        for (const n of data.nodes) {
          addNode({ ...n, id: nanoid() })
        }
      }

      // If critique, set annotations
      if (data.annotations && mode === 'critique') {
        useCanvasStore.getState().setCritiqueAnnotations(data.annotations)
        useCanvasStore.getState().toggleCritique()
      }

    } catch (err) {
      addAIMessage({
        id: nanoid(), role: 'assistant',
        content: '⚠ AI request failed. Credit refunded.',
        timestamp: new Date().toISOString(),
      })
      useCanvasStore.getState().setCredits(credits) // refund
    } finally {
      setAILoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Context indicator */}
      <div className="px-3 py-2 border-b border-white/[0.06] flex-shrink-0 bg-layer/50">
        <div className="font-mono text-[8px] text-white/25 uppercase tracking-[1px]">
          Context: {node ? node.name : 'Page'} · {file?.tokenSet.tokens.length ?? 0} tokens loaded
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 p-2 border-b border-white/[0.06] flex-shrink-0">
        {([
          { id: 'edit',     label: 'Edit',     cost: 1, desc: 'Modify selection' },
          { id: 'generate', label: 'Generate', cost: 5, desc: 'Create new screen' },
          { id: 'critique', label: 'Review',   cost: 2, desc: 'Design critique' },
          { id: 'query',    label: 'Ask',       cost: 1, desc: 'Answer a question' },
        ] as const).map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={`${m.desc} · ${m.cost} credit${m.cost > 1 ? 's' : ''}`}
            className={`flex-1 py-1 rounded font-mono text-[8px] transition-all ${
              mode === m.id
                ? 'bg-neon/10 text-neon border border-neon/20'
                : 'text-white/30 border border-white/[0.06] hover:text-white/50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
        {aiMessages.length === 0 && (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="font-mono text-[9px] text-white/25 leading-relaxed">
              AI is aware of your selection,<br />design tokens, and subsurface data.
            </p>
            <div className="mt-3 space-y-1">
              {[
                '"Add hover states to this button"',
                '"Generate a settings page"',
                '"Review this for accessibility"',
                '"What fonts does this file use?"',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s.replace(/"/g,''))}
                  className="block w-full text-left px-2 py-1 rounded font-mono text-[9px] text-white/30 hover:bg-white/[0.04] hover:text-white/50 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {aiMessages.map(msg => (
          <div key={msg.id} className={`${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`font-mono text-[8px] uppercase tracking-[0.5px] mb-1 ${msg.role === 'user' ? 'text-white/25 text-right' : 'text-neon/60 flex items-center gap-1'}`}>
              {msg.role === 'user' ? 'YOU' : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-neon" />
                  SUBSRF AI {msg.creditsUsed ? `· ${msg.creditsUsed} credit${msg.creditsUsed > 1 ? 's' : ''}` : ''}
                </>
              )}
            </div>
            <div className={`inline-block max-w-full rounded-lg px-3 py-2 font-mono text-[9.5px] leading-[1.7] text-left ${
              msg.role === 'user'
                ? 'bg-white/[0.06] text-white/60 border border-white/[0.08]'
                : 'bg-layer text-white/70 border border-white/[0.08]'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {aiLoading && (
          <div>
            <div className="font-mono text-[8px] text-neon/60 flex items-center gap-1 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-neon animate-blink" />
              SUBSRF AI · thinking…
            </div>
            <div className="flex gap-1 px-3 py-2 bg-layer border border-white/[0.08] rounded-lg w-16">
              <div className="w-1.5 h-1.5 rounded-full bg-neon/40 animate-blink" style={{ animationDelay: '0s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-neon/40 animate-blink" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-neon/40 animate-blink" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
        <div className={`flex gap-2 bg-layer border rounded-lg p-2 transition-all ${input ? 'border-neon/20' : 'border-white/[0.08]'}`}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={
              mode === 'edit'     ? 'Describe the change…' :
              mode === 'generate' ? 'Describe a screen or component…' :
              mode === 'critique' ? 'What to review? (or leave blank for full review)' :
              'Ask anything about the design…'
            }
            rows={2}
            className="flex-1 bg-transparent outline-none font-mono text-[10px] text-t1 placeholder-white/20 resize-none leading-relaxed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || aiLoading}
            className="w-7 h-7 self-end bg-neon text-void rounded flex items-center justify-center font-mono text-[11px] font-bold hover:opacity-88 disabled:opacity-30 transition-all flex-shrink-0"
          >
            ↑
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-[8px] text-white/20">↵ to send · shift+↵ newline</span>
          <span className="font-mono text-[8px] text-white/25">
            {creditCosts[mode]} credit{creditCosts[mode] > 1 ? 's' : ''} · {credits} remaining
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Push tab ──────────────────────────────────────────────────────────────

function PushTab() {
  const { file, pendingChanges, pushRecords, addPushRecord, clearPendingChanges, activePage } = useCanvasStore()
  const [pushing, setPushing] = useState(false)
  const [scope, setScope] = useState<'component'|'page'|'full'>('page')

  async function handlePush() {
    if (!file?.githubRepo || pushing) return
    setPushing(true)
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, scope, changedNodeIds: pendingChanges }),
      })
      const data = await res.json()
      addPushRecord({
        id: nanoid(), fileId: file.id, scope,
        branch: data.branch ?? `subsrf/${scope}-${Date.now()}`,
        prUrl: data.prUrl,
        previewUrl: data.previewUrl,
        changedFiles: data.changedFiles ?? [],
        createdAt: new Date().toISOString(),
        status: data.success ? 'success' : 'failed',
      })
      if (data.success) clearPendingChanges()
    } catch {
      addPushRecord({
        id: nanoid(), fileId: file.id, scope,
        branch: 'failed', changedFiles: [],
        createdAt: new Date().toISOString(), status: 'failed',
      })
    } finally {
      setPushing(false)
    }
  }

  const lastPush = pushRecords[0]

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Repo status */}
      <div className="mb-3">
        <SectionLabel>Repository</SectionLabel>
        <div className="bg-layer border border-white/[0.07] rounded-lg p-3 space-y-1.5">
          {[
            { label: 'Repo',    val: file?.githubRepo ?? 'Not connected', ok: !!file?.githubRepo },
            { label: 'Branch',  val: file?.githubBranch ?? 'main' },
            { label: 'Changed', val: `${pendingChanges.length} element${pendingChanges.length !== 1 ? 's' : ''}`, warn: pendingChanges.length > 0 },
            { label: 'Last push', val: lastPush ? new Date(lastPush.createdAt).toLocaleTimeString() : 'Never' },
          ].map(({ label, val, ok, warn }) => (
            <div key={label} className="flex justify-between items-center font-mono text-[9px]">
              <span className="text-white/30">{label}</span>
              <span className={ok ? 'text-ok' : warn ? 'text-warn' : 'text-white/55'}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scope selector */}
      <div className="mb-3">
        <SectionLabel>Push scope</SectionLabel>
        <div className="flex gap-1">
          {(['component','page','full'] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`flex-1 py-1.5 rounded font-mono text-[9px] capitalize transition-all ${
                scope === s ? 'bg-neon/10 text-neon border border-neon/20' : 'text-white/30 border border-white/[0.07] hover:text-white/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Changed files preview */}
      {pendingChanges.length > 0 && (
        <div className="mb-3">
          <SectionLabel>Changed elements</SectionLabel>
          <div className="bg-layer border border-white/[0.07] rounded-lg p-2 space-y-1 max-h-28 overflow-y-auto">
            {pendingChanges.slice(0,10).map(id => {
              const node = activePage?.nodes.find(n => n.id === id)
              return (
                <div key={id} className="flex items-center gap-1.5 font-mono text-[9px]">
                  <span className="text-warn">M</span>
                  <span className="text-white/50 truncate">{node?.name ?? id.slice(0,8)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Push button */}
      <button
        onClick={handlePush}
        disabled={pushing || pendingChanges.length === 0 || !file?.githubRepo}
        className="w-full py-2.5 bg-neon text-void font-mono text-[11px] font-semibold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all mb-2"
      >
        {pushing ? <><div className="w-3 h-3 border border-void border-t-transparent rounded-full animate-spin" /> Pushing…</> : '↑ Push to GitHub'}
      </button>

      <button
        className="w-full py-2 bg-transparent text-white/40 border border-white/[0.08] font-mono text-[10px] rounded-lg flex items-center justify-center gap-1.5 hover:border-white/15 hover:text-white/60 transition-all"
        onClick={() => {/* open preview */}}
      >
        ⬚ Preview
      </button>

      {/* Push history */}
      {pushRecords.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Recent pushes</SectionLabel>
          <div className="space-y-1.5">
            {pushRecords.slice(0,5).map(r => (
              <div key={r.id} className="bg-layer border border-white/[0.07] rounded px-2.5 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[9px] text-white/50 truncate">{r.branch}</span>
                  <span className={`font-mono text-[8px] ${r.status === 'success' ? 'text-ok' : r.status === 'failed' ? 'text-err' : 'text-warn'}`}>
                    {r.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] text-white/25">{new Date(r.createdAt).toLocaleTimeString()}</span>
                  {r.prUrl && (
                    <a href={r.prUrl} target="_blank" rel="noopener" className="font-mono text-[8px] text-neon/60 hover:text-neon" onClick={e => e.stopPropagation()}>
                      PR →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Linter tab ────────────────────────────────────────────────────────────

function LinterTab() {
  const { violations, linterRules, linterRunning, dismissViolation, toggleLinterRule, activePage, file, setSelectedNodes } = useCanvasStore()
  const tokens = file?.tokenSet.tokens ?? []

  const criticals = violations.filter(v => v.severity === 'critical')
  const warnings  = violations.filter(v => v.severity === 'warning')
  const infos     = violations.filter(v => v.severity === 'info')

  async function runLint() {
    useCanvasStore.setState({ linterRunning: true })
    await new Promise(r => setTimeout(r, 400))
    const { runLinter } = await import('@/lib/utils')
    const nodes = activePage?.nodes ?? []
    const vs = runLinter(nodes, tokens)
    useCanvasStore.getState().setViolations(vs)
    useCanvasStore.setState({ linterRunning: false })
  }

  const groups = [
    { label: 'Critical', items: criticals, color: 'text-err', bg: 'bg-err/5 border-err/15' },
    { label: 'Warning',  items: warnings,  color: 'text-warn', bg: 'bg-warn/5 border-warn/15' },
    { label: 'Info',     items: infos,     color: 'text-blue', bg: 'bg-blue/5 border-blue/15' },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="font-mono text-[10px] text-t1 font-medium">
            {violations.length} issue{violations.length !== 1 ? 's' : ''}
          </div>
          <div className="font-mono text-[8px] text-white/25">
            {criticals.length} critical · {warnings.length} warning · {infos.length} info
          </div>
        </div>
        <button
          onClick={runLint}
          disabled={linterRunning}
          className="px-3 py-1 bg-neon/10 border border-neon/20 rounded font-mono text-[9px] text-neon hover:bg-neon/15 disabled:opacity-40 transition-all flex items-center gap-1"
        >
          {linterRunning ? <><div className="w-2 h-2 border border-neon border-t-transparent rounded-full animate-spin" /> Running…</> : '▶ Run'}
        </button>
      </div>

      {/* Violations */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {violations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">✓</div>
            <p className="font-mono text-[9px] text-white/25">No issues found</p>
          </div>
        ) : (
          groups.map(({ label, items, color, bg }) => items.length > 0 && (
            <div key={label}>
              <div className={`font-mono text-[9px] uppercase tracking-[1.5px] ${color} mb-1.5`}>{label}</div>
              <div className="space-y-1">
                {items.map(v => (
                  <div key={v.id} className={`border rounded-lg p-2.5 ${bg}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[9px] text-white/70 mb-0.5 leading-snug">{v.message}</div>
                        {v.fix && <div className="font-mono text-[8px] text-white/35">{v.fix}</div>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          className="font-mono text-[8px] text-white/25 hover:text-white/50 px-1"
                          onClick={() => setSelectedNodes([v.nodeId])}
                          title="Select element"
                        >→</button>
                        <button
                          className="font-mono text-[8px] text-white/25 hover:text-white/50 px-1"
                          onClick={() => dismissViolation(v.id)}
                          title="Dismiss"
                        >✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rules configuration */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
        <SectionLabel>Rules</SectionLabel>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {linterRules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between py-0.5">
              <span className="font-mono text-[9px] text-white/45 flex-1 truncate">{rule.name}</span>
              <button
                onClick={() => toggleLinterRule(rule.id)}
                className={`w-7 h-4 rounded-full transition-all relative flex-shrink-0 ${rule.enabled ? 'bg-neon' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${rule.enabled ? 'left-3.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Analytics tab ─────────────────────────────────────────────────────────

function AnalyticsTab() {
  const { analyticsConnections, pageAnalytics, activePageId, showAnalyticsOverlay, toggleAnalyticsOverlay } = useCanvasStore()

  const analytics = activePageId ? pageAnalytics[activePageId] : null

  const providers = [
    { id: 'posthog',   name: 'PostHog',   icon: '🦔' },
    { id: 'mixpanel',  name: 'Mixpanel',  icon: '📊' },
    { id: 'amplitude', name: 'Amplitude', icon: '📈' },
    { id: 'ga4',       name: 'GA4',       icon: '📉' },
  ] as const

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Overlay toggle */}
      <div className="flex items-center justify-between mb-4 p-2.5 bg-layer border border-white/[0.07] rounded-lg">
        <div>
          <div className="font-mono text-[10px] text-t1">Heatmap overlay</div>
          <div className="font-mono text-[8px] text-white/30 mt-0.5">Show analytics on canvas</div>
        </div>
        <button
          onClick={toggleAnalyticsOverlay}
          className={`w-9 h-5 rounded-full transition-all relative ${showAnalyticsOverlay ? 'bg-neon' : 'bg-white/10'}`}
        >
          <span className={`absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${showAnalyticsOverlay ? 'left-[19px]' : 'left-[3px]'}`} />
        </button>
      </div>

      {/* Analytics connections */}
      <SectionLabel>Connections</SectionLabel>
      <div className="space-y-1.5 mb-4">
        {providers.map(p => {
          const conn = analyticsConnections.find(c => c.provider === p.id)
          return (
            <div key={p.id} className="flex items-center justify-between p-2.5 bg-layer border border-white/[0.07] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-base">{p.icon}</span>
                <div>
                  <div className="font-mono text-[10px] text-white/60">{p.name}</div>
                  {conn?.connected && conn.projectId && (
                    <div className="font-mono text-[8px] text-white/25">{conn.projectId}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {conn?.connected ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-ok" />
                    <span className="font-mono text-[8px] text-ok">Connected</span>
                  </>
                ) : (
                  <button className="font-mono text-[8px] text-neon/70 bg-neon/10 border border-neon/20 rounded px-2 py-0.5 hover:bg-neon/15 transition-all">
                    Connect
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Metrics */}
      {analytics ? (
        <>
          <SectionLabel>Page metrics</SectionLabel>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: 'Views',    val: analytics.views?.toLocaleString() ?? '—' },
              { label: 'Sessions', val: analytics.sessionCount?.toLocaleString() ?? '—' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-layer border border-white/[0.07] rounded-lg p-2.5 text-center">
                <div className="font-mono text-[18px] font-medium text-t1">{val}</div>
                <div className="font-mono text-[8px] text-white/30 uppercase tracking-[1px]">{label}</div>
              </div>
            ))}
          </div>

          <SectionLabel>AI analysis</SectionLabel>
          <button className="w-full py-2 bg-neon/10 border border-neon/20 rounded-lg font-mono text-[10px] text-neon hover:bg-neon/15 transition-all flex items-center justify-center gap-1.5 mb-2">
            ⚡ Improve from analytics (2 credits)
          </button>
          <button className="w-full py-2 bg-transparent border border-white/[0.08] rounded-lg font-mono text-[9px] text-white/40 hover:border-white/15 hover:text-white/60 transition-all">
            Why is this CTA underperforming? (1 credit)
          </button>
        </>
      ) : (
        <div className="text-center py-6">
          <p className="font-mono text-[9px] text-white/20">Connect an analytics provider<br />to see data here</p>
        </div>
      )}
    </div>
  )
}

// ── Data tab ──────────────────────────────────────────────────────────────

function DataTab() {
  const { dataSources, dataState, setDataState, addDataSource, selectedNodeIds, activePage, bindNodeToData } = useCanvasStore()
  const [addingSource, setAddingSource] = useState(false)
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceName, setNewSourceName] = useState('')

  const node = selectedNodeIds.length === 1
    ? activePage?.nodes.find(n => n.id === selectedNodeIds[0]) ?? null
    : null

  function addRestSource() {
    if (!newSourceUrl) return
    addDataSource({
      id: nanoid(), name: newSourceName || 'API Data', type: 'rest',
      config: { url: newSourceUrl }, schema: [], preview: [],
    })
    setAddingSource(false)
    setNewSourceUrl('')
    setNewSourceName('')
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {/* Data state preview */}
      <div className="mb-4">
        <SectionLabel>Preview state</SectionLabel>
        <div className="flex gap-1">
          {(['normal','loading','populated','empty','error'] as const).map(s => (
            <button
              key={s}
              onClick={() => setDataState(s)}
              className={`flex-1 py-1 rounded font-mono text-[8px] capitalize transition-all ${
                dataState === s ? 'bg-neon/10 text-neon border border-neon/20' : 'text-white/25 border border-white/[0.07] hover:text-white/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sources */}
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>Data sources</SectionLabel>
        <button
          onClick={() => setAddingSource(!addingSource)}
          className="font-mono text-[9px] text-neon/60 hover:text-neon transition-colors"
        >
          + Add
        </button>
      </div>

      {addingSource && (
        <div className="bg-layer border border-white/[0.07] rounded-lg p-3 mb-3 space-y-2">
          <input
            placeholder="Source name"
            value={newSourceName}
            onChange={e => setNewSourceName(e.target.value)}
            className="w-full bg-surface border border-white/[0.08] rounded px-2 py-1.5 font-mono text-[10px] text-white/70 placeholder-white/20 outline-none focus:border-neon/30"
          />
          <input
            placeholder="API URL"
            value={newSourceUrl}
            onChange={e => setNewSourceUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRestSource()}
            className="w-full bg-surface border border-white/[0.08] rounded px-2 py-1.5 font-mono text-[10px] text-white/70 placeholder-white/20 outline-none focus:border-neon/30"
          />
          <div className="flex gap-2">
            <button onClick={addRestSource} className="flex-1 py-1 bg-neon text-void rounded font-mono text-[9px] font-semibold">Add</button>
            <button onClick={() => setAddingSource(false)} className="flex-1 py-1 text-white/30 border border-white/[0.07] rounded font-mono text-[9px]">Cancel</button>
          </div>
        </div>
      )}

      {dataSources.length === 0 ? (
        <div className="py-4 text-center">
          <p className="font-mono text-[9px] text-white/20 leading-relaxed">
            No data sources.<br />Add a REST API, CSV, or JSON file.
          </p>
          <div className="flex flex-col gap-1 mt-3">
            {[
              { type: 'faker', label: '✨ Faker.js (realistic fake data)' },
              { type: 'csv',   label: '📄 Upload CSV' },
              { type: 'json',  label: '{ } Paste JSON' },
            ].map(({ type, label }) => (
              <button
                key={type}
                className="py-1.5 text-white/30 border border-white/[0.07] rounded font-mono text-[9px] hover:text-white/50 hover:border-white/15 transition-all"
                onClick={() => addDataSource({ id: nanoid(), name: label.split(' ').slice(1).join(' '), type: type as any, config: {}, schema: [] })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {dataSources.map(ds => (
            <div key={ds.id} className="bg-layer border border-white/[0.07] rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-white/70 font-medium">{ds.name}</span>
                <span className="font-mono text-[8px] text-white/30 capitalize">{ds.type}</span>
              </div>
              {ds.schema && ds.schema.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ds.schema.slice(0,6).map(f => (
                    <button
                      key={f.name}
                      onClick={() => node && bindNodeToData(node.id, f.name, ds.id)}
                      className="px-1.5 py-0.5 bg-surface border border-white/[0.08] rounded font-mono text-[8px] text-white/40 hover:text-neon/70 hover:border-neon/20 transition-all"
                    >
                      {'{' + f.name + '}'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Right panel ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'design',    label: 'Design',    icon: '⬚' },
  { id: 'subsurface',label: 'Subsrf',    icon: '◎' },
  { id: 'code',      label: 'Code',      icon: '</>' },
  { id: 'ai',        label: 'AI',        icon: '⚡' },
  { id: 'push',      label: 'Push',      icon: '↑' },
  { id: 'linter',    label: 'Lint',      icon: '✓' },
  { id: 'data',      label: 'Data',      icon: '⊞' },
  { id: 'analytics', label: 'Stats',     icon: '📊' },
] as const

export function RightPanel() {
  const { activeRightPanel, setActiveRightPanel, credits, violations } = useCanvasStore()
  const criticals = violations.filter(v => v.severity === 'critical').length

  return (
    <aside className="w-[280px] bg-deep border-l border-white/[0.06] flex flex-col overflow-hidden flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveRightPanel(tab.id as any)}
            className={`
              flex-shrink-0 px-2 py-2 font-mono text-[8px] uppercase tracking-[0.8px] transition-all border-b-2 relative
              ${activeRightPanel === tab.id
                ? 'text-neon border-neon'
                : 'text-white/25 border-transparent hover:text-white/40'
              }
            `}
            title={tab.label}
          >
            {tab.icon}
            {tab.id === 'linter' && criticals > 0 && (
              <span className="absolute top-1 right-0.5 w-1.5 h-1.5 rounded-full bg-err" />
            )}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeRightPanel === 'design'     && <DesignTab />}
        {activeRightPanel === 'subsurface' && <SubsurfaceTab />}
        {activeRightPanel === 'code'       && <CodeTab />}
        {activeRightPanel === 'ai'         && <AITab />}
        {activeRightPanel === 'push'       && <PushTab />}
        {activeRightPanel === 'linter'     && <LinterTab />}
        {activeRightPanel === 'data'       && <DataTab />}
        {activeRightPanel === 'analytics'  && <AnalyticsTab />}
      </div>

      {/* Credit strip */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.06] flex-shrink-0 bg-layer/50">
        <span className="font-mono text-[9px] text-white/25">credits</span>
        <span className="font-mono text-[11px] text-neon font-medium">{credits}</span>
      </div>
    </aside>
  )
}

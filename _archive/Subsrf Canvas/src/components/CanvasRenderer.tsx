'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'
import { colorToRgba, colorToHex, snapToGrid, makeFrame, makeText, makeRect, makeButton, generateSubsurfaceData } from '@/lib/utils'
import type { CanvasNode, Color } from '@/types'
import { nanoid } from 'nanoid'

// ── Node renderer ─────────────────────────────────────────────────────────

function fillToCSS(fills: CanvasNode['fills']): string {
  if (!fills?.length) return 'transparent'
  const fill = fills[0]
  if (fill.type === 'SOLID' && fill.color) return colorToRgba(fill.color)
  if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
    const angle = fill.gradientAngle ?? 135
    const stops = fill.gradientStops.map(s => `${colorToRgba(s.color)} ${Math.round(s.position*100)}%`).join(', ')
    return `linear-gradient(${angle}deg, ${stops})`
  }
  if (fill.type === 'IMAGE' && fill.imageUrl) return `url(${fill.imageUrl})`
  return 'transparent'
}

function shadowToCSS(shadows: CanvasNode['shadows']): string {
  if (!shadows?.length) return 'none'
  return shadows.map(s =>
    `${s.type === 'INNER_SHADOW' ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${colorToRgba(s.color)}`
  ).join(', ')
}

function strokeToCSS(strokes: CanvasNode['strokes']): string | undefined {
  if (!strokes?.length) return undefined
  const s = strokes[0]
  return `${s.weight}px solid ${colorToRgba(s.color)}`
}

// ── Linter annotation overlay ─────────────────────────────────────────────

function ViolationBadge({ severity, count, onClick }: { severity: string; count: number; onClick: () => void }) {
  const colors = { critical: '#FF4D4D', warning: '#FFB020', info: '#4A9EFF' }
  const color = colors[severity as keyof typeof colors] ?? '#888'
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute', top: -8, right: -8,
        width: 16, height: 16, borderRadius: '50%',
        background: color, border: '1.5px solid #050508',
        fontSize: 8, fontFamily: 'Azeret Mono', fontWeight: 700,
        color: 'white', cursor: 'pointer', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {count}
    </button>
  )
}

// ── Single node renderer ──────────────────────────────────────────────────

interface NodeRendererProps {
  node: CanvasNode
  scale: number
  violations: import('@/types').ConstraintViolation[]
  isSelected: boolean
  isHovered: boolean
  onSelect: (id: string, multi: boolean) => void
  onHover: (id: string | null) => void
  onDoubleClick: (id: string) => void
  showAnalytics: boolean
  showLinter: boolean
  dataState: string
  breakpointWidth: number
}

function CanvasNodeRenderer({
  node, scale, violations, isSelected, isHovered,
  onSelect, onHover, onDoubleClick, showAnalytics, showLinter, dataState, breakpointWidth,
}: NodeRendererProps) {
  if (!node.visible) return null

  const nodeViolations = violations.filter(v => v.nodeId === node.id)
  const criticalCount = nodeViolations.filter(v => v.severity === 'critical').length
  const warnCount     = nodeViolations.filter(v => v.severity === 'warning').length

  const responsiveOverrides: Partial<CanvasNode> = {}
  if (node.responsiveRules) {
    for (const rule of node.responsiveRules) {
      if (breakpointWidth <= rule.breakpoint) {
        ;(responsiveOverrides as any)[rule.property] = rule.value
      }
    }
  }
  const effectiveNode = { ...node, ...responsiveOverrides }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: effectiveNode.x,
    top: effectiveNode.y,
    width: effectiveNode.width,
    height: effectiveNode.height,
    opacity: effectiveNode.opacity,
    borderRadius: effectiveNode.cornerRadius !== undefined ? effectiveNode.cornerRadius : undefined,
    background: fillToCSS(effectiveNode.fills),
    boxShadow: shadowToCSS(effectiveNode.shadows),
    border: strokeToCSS(effectiveNode.strokes),
    overflow: effectiveNode.clipContent ? 'hidden' : 'visible',
    cursor: node.locked ? 'not-allowed' : 'default',
    outline: isSelected
      ? '2px solid #4A9EFF'
      : isHovered && !isSelected
        ? '1.5px dashed rgba(74,158,255,0.5)'
        : undefined,
    outlineOffset: isSelected ? 1 : 0,
    transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
  }

  if (effectiveNode.autoLayout && effectiveNode.autoLayout.mode !== 'NONE') {
    const al = effectiveNode.autoLayout
    style.display = 'flex'
    style.flexDirection = al.mode === 'HORIZONTAL' ? 'row' : 'column'
    style.gap = al.gap
    style.padding = `${al.paddingTop}px ${al.paddingRight}px ${al.paddingBottom}px ${al.paddingLeft}px`
    if (al.primaryAxis === 'CENTER')        style.justifyContent = 'center'
    if (al.primaryAxis === 'END')           style.justifyContent = 'flex-end'
    if (al.primaryAxis === 'SPACE_BETWEEN') style.justifyContent = 'space-between'
    if (al.counterAxis === 'CENTER')        style.alignItems = 'center'
    if (al.counterAxis === 'END')           style.alignItems = 'flex-end'
    if (al.counterAxis === 'STRETCH')       style.alignItems = 'stretch'
    if (al.wrap)                            style.flexWrap = 'wrap'
    if (al.minWidth)                        style.minWidth = al.minWidth
    if (al.maxWidth)                        style.maxWidth = al.maxWidth
  }

  if (effectiveNode.type === 'TEXT' && effectiveNode.typography) {
    const t = effectiveNode.typography
    style.fontFamily  = t.fontFamily
    style.fontSize    = t.fontSize
    style.fontWeight  = t.fontWeight
    style.lineHeight  = t.lineHeight
    style.letterSpacing = t.letterSpacing !== 0 ? `${t.letterSpacing}px` : undefined
    style.textAlign   = t.textAlign
    style.color       = colorToRgba(t.color)
    style.background  = 'transparent'
    style.whiteSpace  = 'pre-wrap'
    style.wordBreak   = 'break-word'
  }

  if (effectiveNode.type === 'IMAGE' && effectiveNode.fills?.[0]?.imageUrl) {
    style.backgroundImage  = `url(${effectiveNode.fills[0].imageUrl})`
    style.backgroundSize   = 'cover'
    style.backgroundPosition = 'center'
  }

  const hasAnalytics = showAnalytics && node.analytics
  const clickRate = node.analytics?.clickRate
  const isLoadingState = dataState === 'loading' && node.dataBindings && Object.keys(node.dataBindings).length > 0

  return (
    <div
      style={{ ...style, position: 'absolute' }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={e => { e.stopPropagation(); onSelect(node.id, e.shiftKey || e.metaKey) }}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick(node.id) }}
      data-node-id={node.id}
    >
      {effectiveNode.type === 'TEXT' && (
        isLoadingState
          ? <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: '1em', width: '70%' }} />
          : <>{effectiveNode.characters}</>
      )}

      {effectiveNode.children?.map(child => (
        <CanvasNodeRenderer
          key={child.id}
          node={child}
          scale={scale}
          violations={violations}
          isSelected={false}
          isHovered={false}
          onSelect={onSelect}
          onHover={onHover}
          onDoubleClick={onDoubleClick}
          showAnalytics={showAnalytics}
          showLinter={showLinter}
          dataState={dataState}
          breakpointWidth={breakpointWidth}
        />
      ))}

      {showLinter && criticalCount > 0 && (
        <ViolationBadge severity="critical" count={criticalCount} onClick={() => {}} />
      )}
      {showLinter && criticalCount === 0 && warnCount > 0 && (
        <ViolationBadge severity="warning" count={warnCount} onClick={() => {}} />
      )}

      {hasAnalytics && clickRate !== undefined && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          background: 'rgba(0,255,135,0.15)',
          border: '1px solid rgba(0,255,135,0.3)',
          borderRadius: 3, padding: '1px 5px',
          fontFamily: 'Azeret Mono', fontSize: 9, color: '#00FF87',
          pointerEvents: 'none',
        }}>
          {Math.round(clickRate * 100)}% CTR
        </div>
      )}

      {showAnalytics && node.analytics?.heatmapUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 40%, rgba(255,80,0,0.25) 0%, transparent 60%)',
          pointerEvents: 'none', borderRadius: effectiveNode.cornerRadius,
        }} />
      )}

      {node.name.startsWith('__generating') && (
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px solid #00FF87',
          borderRadius: effectiveNode.cornerRadius,
          animation: 'gen-pulse 1.5s infinite',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

// ── Selection handles ─────────────────────────────────────────────────────

function SelectionHandles({ node, onResize }: { node: CanvasNode; onResize: (dx: number, dy: number, handle: string) => void }) {
  const handles = ['tl','tm','tr','ml','mr','bl','bm','br']
  const handlePositions: Record<string, React.CSSProperties> = {
    tl: { top: -4, left: -4 }, tm: { top: -4, left: '50%', transform: 'translateX(-50%)' },
    tr: { top: -4, right: -4 }, ml: { top: '50%', left: -4, transform: 'translateY(-50%)' },
    mr: { top: '50%', right: -4, transform: 'translateY(-50%)' },
    bl: { bottom: -4, left: -4 }, bm: { bottom: -4, left: '50%', transform: 'translateX(-50%)' },
    br: { bottom: -4, right: -4 },
  }
  const cursorMap: Record<string, string> = {
    tl: 'nw-resize', tm: 'n-resize', tr: 'ne-resize',
    ml: 'w-resize', mr: 'e-resize',
    bl: 'sw-resize', bm: 's-resize', br: 'se-resize',
  }
  return (
    <>
      {handles.map(h => (
        <div
          key={h}
          style={{
            position: 'absolute', width: 8, height: 8,
            background: '#4A9EFF', border: '1.5px solid #050508',
            borderRadius: 2, cursor: cursorMap[h] ?? 'default', zIndex: 70,
            ...handlePositions[h],
          }}
          onMouseDown={e => {
            e.stopPropagation()
            const startX = e.clientX, startY = e.clientY
            const onMove = (me: MouseEvent) => onResize(me.clientX - startX, me.clientY - startY, h)
            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        />
      ))}
    </>
  )
}

// ── Smart guide ───────────────────────────────────────────────────────────

interface SmartGuide { orientation: 'h' | 'v'; position: number; start: number; end: number; label: string }

function SmartGuideLayer({ guides }: { guides: SmartGuide[] }) {
  return (
    <>
      {guides.map((g, i) => (
        <div key={i} style={{ position: 'absolute', pointerEvents: 'none', zIndex: 80 }}>
          {g.orientation === 'h' ? (
            <div style={{
              position: 'absolute', left: g.start, top: g.position,
              width: g.end - g.start, height: 1,
              background: 'rgba(74,158,255,0.6)',
            }} />
          ) : (
            <div style={{
              position: 'absolute', left: g.position, top: g.start,
              width: 1, height: g.end - g.start,
              background: 'rgba(74,158,255,0.6)',
            }} />
          )}
          <div style={{
            position: 'absolute',
            left: g.orientation === 'h' ? (g.start + g.end) / 2 - 16 : g.position + 4,
            top:  g.orientation === 'v' ? (g.start + g.end) / 2 - 8  : g.position + 4,
            background: '#4A9EFF', color: 'white', borderRadius: 2,
            padding: '1px 5px', fontSize: 9, fontFamily: 'Azeret Mono',
            whiteSpace: 'nowrap',
          }}>
            {g.label}
          </div>
        </div>
      ))}
    </>
  )
}

// ── Live cursor ───────────────────────────────────────────────────────────

function LiveCursor({ name, color, x, y }: { name: string; color: string; x: number; y: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 200, transform: 'translate(-2px,-2px)' }}>
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
        <path d="M0 0 L0 16 L4.5 12 L8 18 L10 17 L6.5 11 L12 11 Z" fill={color} stroke="white" strokeWidth="1"/>
      </svg>
      <div style={{
        position: 'absolute', top: 18, left: 10,
        background: color, color: 'white', borderRadius: 3,
        padding: '2px 7px', fontSize: 9, fontFamily: 'Azeret Mono',
        fontWeight: 500, whiteSpace: 'nowrap',
      }}>
        {name}
      </div>
    </div>
  )
}

// ── Comment pin ───────────────────────────────────────────────────────────

function CommentPin({ comment, onClick }: { comment: import('@/types').Comment; onClick: () => void }) {
  const colors = { blocker: '#FF4D4D', required: '#FFB020', suggestion: '#4A9EFF' }
  const color = colors[comment.severity]
  return (
    <div
      style={{ position: 'absolute', left: comment.x, top: comment.y, zIndex: 150, cursor: 'pointer' }}
      onClick={e => { e.stopPropagation(); onClick() }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
        background: color, border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ transform: 'rotate(45deg)', fontSize: 9 }}>💬</span>
      </div>
    </div>
  )
}

// ── Responsive slider ─────────────────────────────────────────────────────

function ResponsiveSlider({ value, onChange }: { value: number; onChange: (w: number) => void }) {
  const breakpoints = [320, 390, 768, 1024, 1440, 1920]
  const icons = ['📱','📱','📟','💻','🖥','🖥']
  const names = ['Mobile S','Mobile','Tablet','Laptop','Desktop','Wide']
  return (
    <div style={{
      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 0 10px 10px',
      padding: '8px 16px', zIndex: 110, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontFamily: 'Azeret Mono', fontSize: 9, color: 'rgba(240,240,244,0.35)', letterSpacing: 1, textTransform: 'uppercase' }}>Viewport</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {breakpoints.map((bp, i) => (
          <button key={bp} onClick={() => onChange(bp)} style={{
            background: value === bp ? 'rgba(0,255,135,0.12)' : 'transparent',
            border: value === bp ? '1px solid rgba(0,255,135,0.25)' : '1px solid transparent',
            borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
            color: value === bp ? '#00FF87' : 'rgba(240,240,244,0.35)',
            fontFamily: 'Azeret Mono', fontSize: 9, transition: 'all 0.12s',
          }}>
            {icons[i]} {names[i]}
          </button>
        ))}
      </div>
      <div style={{ fontFamily: 'Azeret Mono', fontSize: 10, color: '#00FF87', minWidth: 50 }}>{value}px</div>
      <input
        type="range" min={320} max={1920} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 120, accentColor: '#00FF87' }}
      />
    </div>
  )
}

// ── Sketch overlay ────────────────────────────────────────────────────────

function SketchOverlay({ onDone }: { onDone: (strokes: Array<{x:number;y:number}[]>) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Array<{x:number;y:number}[]>>([])
  const drawingRef = useRef(false)

  const startDraw = useCallback((e: React.MouseEvent) => {
    drawingRef.current = true
    const rect = canvasRef.current!.getBoundingClientRect()
    strokesRef.current.push([{ x: e.clientX - rect.left, y: e.clientY - rect.top }])
  }, [])

  const draw = useCallback((e: React.MouseEvent) => {
    if (!drawingRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const ctx = canvasRef.current.getContext('2d')!
    const strokes = strokesRef.current
    const last = strokes[strokes.length - 1]
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    last.push(pt)
    const prev = last[last.length - 2]
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.strokeStyle = '#00FF87'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }, [])

  const stopDraw = useCallback(() => { drawingRef.current = false }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 300 }}>
      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 1440}
        height={typeof window !== 'undefined' ? window.innerHeight : 900}
        style={{ cursor: 'crosshair', background: 'rgba(0,0,0,0.3)' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
      />
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
        <button onClick={() => onDone(strokesRef.current)} style={{
          background: '#00FF87', color: '#050508', border: 'none', borderRadius: 6,
          padding: '8px 16px', fontFamily: 'Azeret Mono', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
          ✓ Clean up sketch (5 credits)
        </button>
        <button onClick={() => onDone([])} style={{
          background: 'rgba(255,255,255,0.08)', color: 'rgba(240,240,244,0.6)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
          padding: '8px 16px', fontFamily: 'Azeret Mono', fontSize: 11, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main canvas component ─────────────────────────────────────────────────

export function CanvasRenderer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [drawingRect, setDrawingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const isDraggingNode = useRef(false)
  const dragNodeStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 })

  const {
    activePage, selectedNodeIds, viewport, activeTool,
    violations, showLinterPanel, showAnalyticsOverlay, showResponsiveSlider,
    collaborators, comments, showComments, sketchMode,
    generationJobs, dataState, breakpointWidth,
    setSelectedNodes, clearSelection, setHoveredNode, hoveredNodeId,
    addNode, updateNode, moveNode, resizeNode,
    setViewport, setBreakpointWidth,
    setActiveTool, setActiveRightPanel,
    file,
  } = useCanvasStore()

  const tokens = file?.tokenSet.tokens ?? []

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      const { key, metaKey, ctrlKey, shiftKey } = e
      const mod = metaKey || ctrlKey

      if (key === 'v' || key === 'Escape') useCanvasStore.getState().setActiveTool('select')
      if (key === 'f') useCanvasStore.getState().setActiveTool('frame')
      if (key === 'r') useCanvasStore.getState().setActiveTool('rect')
      if (key === 't') useCanvasStore.getState().setActiveTool('text')
      if (key === 'a') useCanvasStore.getState().setActiveTool('ai')
      if (key === 'c' && !mod) useCanvasStore.getState().setActiveTool('comment')
      if (key === 'h') useCanvasStore.getState().setActiveTool('hand')

      if (mod && key === 'z' && !shiftKey) useCanvasStore.getState().undo()
      if (mod && key === 'z' && shiftKey)  useCanvasStore.getState().redo()
      if (mod && key === 'd') {
        e.preventDefault()
        useCanvasStore.getState().duplicateNodes(selectedNodeIds)
      }
      if ((key === 'Delete' || key === 'Backspace') && selectedNodeIds.length > 0) {
        useCanvasStore.getState().deleteNodes(selectedNodeIds)
      }
      if (mod && key === 'g') { e.preventDefault(); useCanvasStore.getState().groupNodes(selectedNodeIds) }

      if (mod && (key === '=' || key === '+')) { e.preventDefault(); setViewport({ zoom: Math.min(viewport.zoom * 1.25, 20) }) }
      if (mod && key === '-') { e.preventDefault(); setViewport({ zoom: Math.max(viewport.zoom * 0.8, 0.05) }) }
      if (mod && key === '0') { e.preventDefault(); setViewport({ zoom: 1 }) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNodeIds, viewport.zoom])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const rect = containerRef.current!.getBoundingClientRect()
    const cx = (e.clientX - rect.left - viewport.x) / viewport.zoom
    const cy = (e.clientY - rect.top  - viewport.y) / viewport.zoom

    if (activeTool === 'select') {
      clearSelection()
      isDragging.current = true
      dragStart.current = { x: cx, y: cy }
      return
    }

    if (activeTool === 'hand') {
      isDragging.current = true
      dragStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y }
      return
    }

    if (['frame','rect','ellipse'].includes(activeTool)) {
      isDragging.current = true
      dragStart.current = { x: cx, y: cy }
      setDrawingRect({ x: cx, y: cy, w: 0, h: 0 })
    }
  }, [activeTool, viewport, clearSelection])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const rect = containerRef.current!.getBoundingClientRect()
    const cx = (e.clientX - rect.left - viewport.x) / viewport.zoom
    const cy = (e.clientY - rect.top  - viewport.y) / viewport.zoom

    if (activeTool === 'hand') {
      setViewport({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
      return
    }

    if (['frame','rect','ellipse'].includes(activeTool)) {
      setDrawingRect({ x: dragStart.current.x, y: dragStart.current.y, w: cx - dragStart.current.x, h: cy - dragStart.current.y })
    }
  }, [activeTool, viewport])

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    const rect = containerRef.current!.getBoundingClientRect()
    const cx = (e.clientX - rect.left - viewport.x) / viewport.zoom
    const cy = (e.clientY - rect.top  - viewport.y) / viewport.zoom

    if (drawingRect && (Math.abs(drawingRect.w) > 4 || Math.abs(drawingRect.h) > 4)) {
      const x = snapToGrid(Math.min(drawingRect.x, drawingRect.x + drawingRect.w))
      const y = snapToGrid(Math.min(drawingRect.y, drawingRect.y + drawingRect.h))
      const w = snapToGrid(Math.abs(drawingRect.w))
      const h = snapToGrid(Math.abs(drawingRect.h))

      let newNode: CanvasNode
      if (activeTool === 'frame') {
        newNode = makeFrame({ x, y, width: w, height: h, name: 'Frame' })
      } else {
        newNode = makeRect({ x, y, width: w, height: h, type: activeTool === 'ellipse' ? 'ELLIPSE' : 'RECTANGLE' })
      }

      addNode(newNode)
      setSelectedNodes([newNode.id])
      setActiveTool('select')
    } else if (activeTool === 'text') {
      const newNode = makeText('Text', { x: snapToGrid(cx), y: snapToGrid(cy) })
      addNode(newNode)
      setSelectedNodes([newNode.id])
      setActiveTool('select')
    } else if (activeTool === 'comment') {
      const comment: import('@/types').Comment = {
        id: nanoid(), fileId: file?.id ?? '', pageId: activePage?.id ?? '',
        authorId: 'me', authorName: 'You', x: cx, y: cy,
        text: '', category: 'visual', severity: 'suggestion',
        resolved: false, createdAt: new Date().toISOString(), replies: [],
      }
      useCanvasStore.getState().addComment(comment)
      setActiveTool('select')
    }

    setDrawingRect(null)
  }, [activeTool, drawingRect, addNode, setSelectedNodes, setActiveTool, viewport, file, activePage])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const rect = containerRef.current!.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const newZoom = Math.max(0.05, Math.min(20, viewport.zoom * delta))
      const sx = mx - (mx - viewport.x) * (newZoom / viewport.zoom)
      const sy = my - (my - viewport.y) * (newZoom / viewport.zoom)
      setViewport({ zoom: newZoom, x: sx, y: sy })
    } else {
      setViewport({ x: viewport.x - e.deltaX, y: viewport.y - e.deltaY })
    }
  }, [viewport, setViewport])

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (activeTool !== 'select') return
    e.stopPropagation()
    const node = activePage?.nodes.find(n => n.id === nodeId)
    if (!node || node.locked) return
    isDraggingNode.current = true
    dragNodeStart.current = { x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y }
    const onMove = (me: MouseEvent) => {
      if (!isDraggingNode.current) return
      const dx = (me.clientX - dragNodeStart.current.x) / viewport.zoom
      const dy = (me.clientY - dragNodeStart.current.y) / viewport.zoom
      moveNode(nodeId, snapToGrid(dragNodeStart.current.nodeX + dx), snapToGrid(dragNodeStart.current.nodeY + dy))
    }
    const onUp = () => {
      isDraggingNode.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [activeTool, activePage, viewport.zoom, moveNode])

  const handleNodeSelect = useCallback((id: string, multi: boolean) => {
    if (multi) useCanvasStore.getState().addToSelection(id)
    else setSelectedNodes([id])
    setActiveRightPanel('design')
  }, [setSelectedNodes, setActiveRightPanel])

  const handleResize = useCallback((nodeId: string, dx: number, dy: number, handle: string) => {
    const node = activePage?.nodes.find(n => n.id === nodeId)
    if (!node) return
    let { x, y, width, height } = node
    const dxS = dx / viewport.zoom, dyS = dy / viewport.zoom
    if (handle.includes('r')) width  = snapToGrid(Math.max(8, width  + dxS))
    if (handle.includes('b')) height = snapToGrid(Math.max(8, height + dyS))
    if (handle.includes('l')) { x = snapToGrid(x + dxS); width  = snapToGrid(Math.max(8, width  - dxS)) }
    if (handle.includes('t')) { y = snapToGrid(y + dyS); height = snapToGrid(Math.max(8, height - dyS)) }
    updateNode(nodeId, { x, y, width, height })
  }, [activePage, viewport.zoom, updateNode])

  if (!activePage) return (
    <div className="flex-1 bg-void flex items-center justify-center">
      <p className="font-mono text-xs text-white/20">No page selected</p>
    </div>
  )

  const activeGenerations = generationJobs.filter(j => j.status === 'running' || j.status === 'queued')

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-void"
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
        backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        cursor: activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair',
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      {showResponsiveSlider && (
        <ResponsiveSlider value={breakpointWidth} onChange={setBreakpointWidth} />
      )}

      <div className="absolute top-3 left-3 font-mono text-[9px] text-white/20 z-10 select-none">
        {activePage.name} · {Math.round(viewport.zoom * 100)}%
      </div>

      {activeGenerations.length > 0 && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-layer border border-white/10 rounded-md px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon animate-blink" />
          <span className="font-mono text-[9px] text-neon">
            {activeGenerations[0].progressMsg ?? 'Generating…'}
          </span>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {activePage.nodes.map(node => (
          <div key={node.id} onMouseDown={e => handleNodeMouseDown(node.id, e)}>
            <CanvasNodeRenderer
              node={node}
              scale={viewport.zoom}
              violations={violations}
              isSelected={selectedNodeIds.includes(node.id)}
              isHovered={hoveredNodeId === node.id}
              onSelect={handleNodeSelect}
              onHover={setHoveredNode}
              onDoubleClick={id => { setSelectedNodes([id]); setActiveRightPanel('design') }}
              showAnalytics={showAnalyticsOverlay}
              showLinter={showLinterPanel}
              dataState={dataState}
              breakpointWidth={breakpointWidth}
            />
            {selectedNodeIds.includes(node.id) && selectedNodeIds.length === 1 && (
              <div style={{ position: 'absolute', left: node.x, top: node.y, width: node.width, height: node.height }}>
                <SelectionHandles
                  node={node}
                  onResize={(dx, dy, h) => handleResize(node.id, dx, dy, h)}
                />
              </div>
            )}
          </div>
        ))}

        {selectedNodeIds.length > 1 && (() => {
          const selNodes = selectedNodeIds.map(id => activePage.nodes.find(n => n.id === id)).filter(Boolean) as CanvasNode[]
          if (!selNodes.length) return null
          const minX = Math.min(...selNodes.map(n => n.x))
          const minY = Math.min(...selNodes.map(n => n.y))
          const maxX = Math.max(...selNodes.map(n => n.x + n.width))
          const maxY = Math.max(...selNodes.map(n => n.y + n.height))
          return (
            <div style={{
              position: 'absolute', left: minX - 2, top: minY - 2,
              width: maxX - minX + 4, height: maxY - minY + 4,
              border: '2px solid #4A9EFF', pointerEvents: 'none',
            }} />
          )
        })()}

        {showComments && comments.filter(c => !c.resolved && c.pageId === activePage.id).map(comment => (
          <CommentPin key={comment.id} comment={comment} onClick={() => {}} />
        ))}
      </div>

      {drawingRect && (
        <div style={{
          position: 'absolute',
          left: viewport.x + Math.min(drawingRect.x, drawingRect.x + drawingRect.w) * viewport.zoom,
          top:  viewport.y + Math.min(drawingRect.y, drawingRect.y + drawingRect.h) * viewport.zoom,
          width:  Math.abs(drawingRect.w) * viewport.zoom,
          height: Math.abs(drawingRect.h) * viewport.zoom,
          border: '2px solid #00FF87',
          background: 'rgba(0,255,135,0.06)',
          pointerEvents: 'none',
        }} />
      )}

      {collaborators.filter(c => c.cursor && c.pageId === activePage.id).map(c => (
        <LiveCursor
          key={c.id}
          name={c.name}
          color={c.color}
          x={viewport.x + (c.cursor!.x * viewport.zoom)}
          y={viewport.y + (c.cursor!.y * viewport.zoom)}
        />
      ))}

      {sketchMode && (
        <SketchOverlay onDone={strokes => {
          useCanvasStore.getState().setSketchMode(false)
        }} />
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface border border-white/10 rounded-md px-3 py-1.5 z-10">
        <button
          className="font-mono text-[11px] text-white/40 hover:text-white/80 transition-colors px-1"
          onClick={() => setViewport({ zoom: Math.max(0.05, viewport.zoom * 0.8) })}
        >−</button>
        <button
          className="font-mono text-[10px] text-white/50 w-10 text-center hover:text-white/80 transition-colors"
          onClick={() => setViewport({ zoom: 1 })}
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          className="font-mono text-[11px] text-white/40 hover:text-white/80 transition-colors px-1"
          onClick={() => setViewport({ zoom: Math.min(20, viewport.zoom * 1.25) })}
        >+</button>
      </div>
    </div>
  )
}

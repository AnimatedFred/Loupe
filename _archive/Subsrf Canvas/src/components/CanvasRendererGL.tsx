'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'
import { snapToGrid, makeFrame, makeText, makeRect } from '@/lib/utils'
import { useWebGLRenderer } from '@/renderer/useWebGLRenderer'
import type { CanvasNode } from '@/types'
import { nanoid } from 'nanoid'

// ── CPU hit-testing ──────────────────────────────────────────────────────────
// Walks nodes back-to-front to return the topmost node at (cx, cy) in canvas coords.

function hitTest(nodes: CanvasNode[], cx: number, cy: number, offX = 0, offY = 0): string | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (!n.visible) continue
    const ax = offX + n.x
    const ay = offY + n.y
    if (cx >= ax && cx <= ax + n.width && cy >= ay && cy <= ay + n.height) {
      if (n.children?.length) {
        const child = hitTest(n.children, cx, cy, ax, ay)
        if (child) return child
      }
      return n.id
    }
  }
  return null
}

// ── Selection handles ────────────────────────────────────────────────────────

function SelectionHandles({ node, viewport, onResize }: {
  node: CanvasNode
  viewport: { x: number; y: number; zoom: number }
  onResize: (dx: number, dy: number, handle: string) => void
}) {
  const sx = node.x * viewport.zoom + viewport.x
  const sy = node.y * viewport.zoom + viewport.y
  const sw = node.width  * viewport.zoom
  const sh = node.height * viewport.zoom

  const handles = ['tl','tm','tr','ml','mr','bl','bm','br']
  const handleCSS: Record<string, React.CSSProperties> = {
    tl: { top: sy - 4, left: sx - 4 },
    tm: { top: sy - 4, left: sx + sw / 2 - 4 },
    tr: { top: sy - 4, left: sx + sw - 4 },
    ml: { top: sy + sh / 2 - 4, left: sx - 4 },
    mr: { top: sy + sh / 2 - 4, left: sx + sw - 4 },
    bl: { top: sy + sh - 4, left: sx - 4 },
    bm: { top: sy + sh - 4, left: sx + sw / 2 - 4 },
    br: { top: sy + sh - 4, left: sx + sw - 4 },
  }
  const cursorMap: Record<string, string> = {
    tl: 'nw-resize', tm: 'n-resize', tr: 'ne-resize',
    ml: 'w-resize', mr: 'e-resize',
    bl: 'sw-resize', bm: 's-resize', br: 'se-resize',
  }
  return (
    <>
      {/* Selection outline */}
      <div style={{
        position: 'absolute',
        left: sx - 1, top: sy - 1,
        width: sw + 2, height: sh + 2,
        border: '2px solid #4A9EFF',
        pointerEvents: 'none',
        zIndex: 60,
      }} />
      {handles.map(h => (
        <div
          key={h}
          style={{
            position: 'absolute',
            width: 8, height: 8,
            background: '#4A9EFF',
            border: '1.5px solid #050508',
            borderRadius: 2,
            cursor: cursorMap[h] ?? 'default',
            zIndex: 70,
            pointerEvents: 'all',
            ...handleCSS[h],
          }}
          onMouseDown={e => {
            e.stopPropagation()
            const startX = e.clientX, startY = e.clientY
            const onMove = (me: MouseEvent) => onResize(me.clientX - startX, me.clientY - startY, h)
            const onUp = () => {
              document.removeEventListener('mousemove', onMove)
              document.removeEventListener('mouseup', onUp)
            }
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp)
          }}
        />
      ))}
    </>
  )
}

// ── Multi-select bounding box ────────────────────────────────────────────────

function MultiSelectBox({ nodes, viewport }: {
  nodes: CanvasNode[]
  viewport: { x: number; y: number; zoom: number }
}) {
  if (!nodes.length) return null
  const minX = Math.min(...nodes.map(n => n.x))
  const minY = Math.min(...nodes.map(n => n.y))
  const maxX = Math.max(...nodes.map(n => n.x + n.width))
  const maxY = Math.max(...nodes.map(n => n.y + n.height))
  const sx = minX * viewport.zoom + viewport.x
  const sy = minY * viewport.zoom + viewport.y
  const sw = (maxX - minX) * viewport.zoom
  const sh = (maxY - minY) * viewport.zoom
  return (
    <div style={{
      position: 'absolute',
      left: sx - 2, top: sy - 2,
      width: sw + 4, height: sh + 4,
      border: '2px solid #4A9EFF',
      pointerEvents: 'none',
      zIndex: 60,
    }} />
  )
}

// ── Live cursor ──────────────────────────────────────────────────────────────

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

// ── Comment pin ──────────────────────────────────────────────────────────────

function CommentPin({ comment, onClick }: { comment: import('@/types').Comment; onClick: () => void }) {
  const colors = { blocker: '#FF4D4D', required: '#FFB020', suggestion: '#4A9EFF' }
  const color = colors[comment.severity]
  return (
    <div
      style={{ position: 'absolute', left: comment.x, top: comment.y, zIndex: 150, cursor: 'pointer', pointerEvents: 'all' }}
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

// ── Responsive slider ────────────────────────────────────────────────────────

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
      pointerEvents: 'all',
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

// ── Sketch overlay ────────────────────────────────────────────────────────────

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
    const ctx  = canvasRef.current.getContext('2d')!
    const last = strokesRef.current[strokesRef.current.length - 1]
    const pt   = { x: e.clientX - rect.left, y: e.clientY - rect.top }
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
    <div style={{ position: 'absolute', inset: 0, zIndex: 300, pointerEvents: 'all' }}>
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

// ── Main GL canvas component ──────────────────────────────────────────────────

export function CanvasRendererGL() {
  const containerRef = useRef<HTMLDivElement>(null)
  const glCanvasRef  = useRef<HTMLCanvasElement>(null)

  const [drawingRect, setDrawingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const isDragging    = useRef(false)
  const dragStart     = useRef({ x: 0, y: 0 })
  const isDraggingNode = useRef(false)
  const dragNodeStart  = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0, nodeId: '' })

  const {
    activePage, selectedNodeIds, viewport, activeTool,
    showResponsiveSlider, showAnalyticsOverlay: _showAnalytics,
    collaborators, comments, showComments, sketchMode,
    generationJobs, breakpointWidth,
    setSelectedNodes, clearSelection, setHoveredNode,
    addNode, updateNode, moveNode,
    setViewport, setBreakpointWidth,
    setActiveTool, setActiveRightPanel,
    file,
  } = useCanvasStore()

  // ── Boot WebGL renderer ──────────────────────────────────────────────────
  const { glReady, error } = useWebGLRenderer(glCanvasRef)

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
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
  }, [selectedNodeIds, viewport.zoom, setViewport])

  // ── Canvas-space coordinate helper ──────────────────────────────────────
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      cx: (clientX - rect.left - viewport.x) / viewport.zoom,
      cy: (clientY - rect.top  - viewport.y) / viewport.zoom,
    }
  }, [viewport])

  // ── Mouse down ───────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const { cx, cy } = toCanvas(e.clientX, e.clientY)

    if (activeTool === 'hand') {
      isDragging.current = true
      dragStart.current = { x: e.clientX - viewport.x, y: e.clientY - viewport.y }
      return
    }

    if (['frame','rect','ellipse'].includes(activeTool)) {
      isDragging.current = true
      dragStart.current = { x: cx, y: cy }
      setDrawingRect({ x: cx, y: cy, w: 0, h: 0 })
      return
    }

    if (activeTool === 'select') {
      // Hit-test for node under cursor
      const hitId = activePage ? hitTest(activePage.nodes, cx, cy) : null
      if (hitId) {
        if (e.shiftKey || e.metaKey) {
          useCanvasStore.getState().addToSelection(hitId)
        } else {
          setSelectedNodes([hitId])
          setActiveRightPanel('design')
        }

        // Begin node drag
        const node = activePage?.nodes.find(n => n.id === hitId)
        if (node && !node.locked) {
          isDraggingNode.current = true
          dragNodeStart.current = { x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y, nodeId: hitId }
          const onMove = (me: MouseEvent) => {
            if (!isDraggingNode.current) return
            const dx = (me.clientX - dragNodeStart.current.x) / viewport.zoom
            const dy = (me.clientY - dragNodeStart.current.y) / viewport.zoom
            moveNode(hitId, snapToGrid(dragNodeStart.current.nodeX + dx), snapToGrid(dragNodeStart.current.nodeY + dy))
          }
          const onUp = () => {
            isDraggingNode.current = false
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
          }
          document.addEventListener('mousemove', onMove)
          document.addEventListener('mouseup', onUp)
        }
      } else {
        clearSelection()
        isDragging.current = true
        dragStart.current = { x: cx, y: cy }
      }
    }
  }, [activeTool, viewport, activePage, toCanvas, setSelectedNodes, clearSelection, setActiveRightPanel, moveNode])

  // ── Mouse move ───────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = toCanvas(e.clientX, e.clientY)

    // Hover hit-test (cheap since we only need the top hit)
    if (activeTool === 'select' && activePage) {
      setHoveredNode(hitTest(activePage.nodes, cx, cy))
    }

    if (!isDragging.current) return

    if (activeTool === 'hand') {
      setViewport({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
      return
    }

    if (['frame','rect','ellipse'].includes(activeTool)) {
      setDrawingRect({ x: dragStart.current.x, y: dragStart.current.y, w: cx - dragStart.current.x, h: cy - dragStart.current.y })
    }
  }, [activeTool, viewport, activePage, toCanvas, setViewport, setHoveredNode])

  // ── Mouse up ─────────────────────────────────────────────────────────────
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    const { cx, cy } = toCanvas(e.clientX, e.clientY)

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
  }, [activeTool, drawingRect, addNode, setSelectedNodes, setActiveTool, toCanvas, file, activePage])

  // ── Wheel zoom ───────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const rect  = containerRef.current!.getBoundingClientRect()
      const mx    = e.clientX - rect.left
      const my    = e.clientY - rect.top
      const newZoom = Math.max(0.05, Math.min(20, viewport.zoom * delta))
      const sx = mx - (mx - viewport.x) * (newZoom / viewport.zoom)
      const sy = my - (my - viewport.y) * (newZoom / viewport.zoom)
      setViewport({ zoom: newZoom, x: sx, y: sy })
    } else {
      setViewport({ x: viewport.x - e.deltaX, y: viewport.y - e.deltaY })
    }
  }, [viewport, setViewport])

  // ── Resize handler (via selection handles) ───────────────────────────────
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

  const activeGenerations = activePage
    ? generationJobs.filter(j => j.status === 'running' || j.status === 'queued')
    : []
  const selNodes = activePage
    ? (selectedNodeIds.map(id => activePage.nodes.find(n => n.id === id)).filter(Boolean) as CanvasNode[])
    : []

  // The container + GL canvas are ALWAYS rendered so glCanvasRef is always attached
  // when useWebGLRenderer's effect fires. "No page" is an overlay, not an early return.
  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-void"
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
        backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        cursor: activeTool === 'hand' ? 'grab'
              : activeTool === 'select' ? 'default'
              : 'crosshair',
      }}
    >
      {/* ── WebGL canvas (node fills / shapes / text) ─────────────────────── */}
      <canvas
        ref={glCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />

      {/* ── GL status (always visible) ───────────────────────────────────── */}
      {(error || (!glReady && !activePage)) && (
        <div className="absolute top-3 left-3 font-mono text-[9px] z-10 select-none pointer-events-none">
          {error && <span className="text-red-400">GL: {error}</span>}
          {!glReady && !error && <span className="text-yellow-400">GL initializing…</span>}
        </div>
      )}

      {!activePage ? (
        /* ── No page placeholder ─────────────────────────────────────────── */
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="font-mono text-xs text-white/20">No page selected</p>
        </div>
      ) : (
        /* ── Active page overlays + interaction ──────────────────────────── */
        <>
          {/* DOM overlay: selection handles + comments + cursors */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
            {selectedNodeIds.length === 1 && selNodes[0] && (
              <SelectionHandles
                node={selNodes[0]}
                viewport={viewport}
                onResize={(dx, dy, h) => handleResize(selNodes[0].id, dx, dy, h)}
              />
            )}
            {selectedNodeIds.length > 1 && (
              <MultiSelectBox nodes={selNodes} viewport={viewport} />
            )}
            {showComments && comments
              .filter(c => !c.resolved && c.pageId === activePage.id)
              .map(comment => {
                const sx = comment.x * viewport.zoom + viewport.x
                const sy = comment.y * viewport.zoom + viewport.y
                return (
                  <CommentPin
                    key={comment.id}
                    comment={{ ...comment, x: sx, y: sy }}
                    onClick={() => {}}
                  />
                )
              })}
            {collaborators
              .filter(c => c.cursor && c.pageId === activePage.id)
              .map(c => (
                <LiveCursor
                  key={c.id} name={c.name} color={c.color}
                  x={viewport.x + c.cursor!.x * viewport.zoom}
                  y={viewport.y + c.cursor!.y * viewport.zoom}
                />
              ))}
          </div>

          {/* Drawing rect preview */}
          {drawingRect && (
            <div style={{
              position: 'absolute', pointerEvents: 'none', zIndex: 55,
              left:   viewport.x + Math.min(drawingRect.x, drawingRect.x + drawingRect.w) * viewport.zoom,
              top:    viewport.y + Math.min(drawingRect.y, drawingRect.y + drawingRect.h) * viewport.zoom,
              width:  Math.abs(drawingRect.w) * viewport.zoom,
              height: Math.abs(drawingRect.h) * viewport.zoom,
              border: '2px solid #00FF87', background: 'rgba(0,255,135,0.06)',
            }} />
          )}

          {/* Responsive slider */}
          {showResponsiveSlider && (
            <ResponsiveSlider value={breakpointWidth} onChange={setBreakpointWidth} />
          )}

          {/* HUD */}
          <div className="absolute top-3 left-3 font-mono text-[9px] text-white/20 z-10 select-none pointer-events-none">
            {activePage.name} · {Math.round(viewport.zoom * 100)}%
          </div>

          {/* Generation badge */}
          {activeGenerations.length > 0 && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-layer border border-white/10 rounded-md px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-neon animate-blink" />
              <span className="font-mono text-[9px] text-neon">
                {activeGenerations[0].progressMsg ?? 'Generating…'}
              </span>
            </div>
          )}

          {/* Mouse event surface — above GL canvas, below overlays */}
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 40 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* Sketch overlay */}
          {sketchMode && (
            <SketchOverlay onDone={() => useCanvasStore.getState().setSketchMode(false)} />
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface border border-white/10 rounded-md px-3 py-1.5 z-50 pointer-events-auto">
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
        </>
      )}
    </div>
  )
}

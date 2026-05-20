'use client'

import { useEffect, useRef, useState } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'
import { ShapeRenderer } from './ShapeRenderer'
import { TextRenderer } from './TextRenderer'

export interface WebGLRendererState {
  glReady: boolean
  error: string | null
}

export function useWebGLRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
): WebGLRendererState {
  const [state, setState] = useState<WebGLRendererState>({ glReady: false, error: null })

  const shapeRef = useRef<ShapeRenderer | null>(null)
  const textRef  = useRef<TextRenderer  | null>(null)
  const glRef    = useRef<WebGL2RenderingContext | null>(null)
  const dirtyRef = useRef(true)
  const rafRef   = useRef<number>(0)
  const cssSizeRef = useRef({ width: 1, height: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── WebGL2 context ───────────────────────────────────────────────────────
    const gl = canvas.getContext('webgl2', {
      antialias: false,           // SDF shader handles its own AA
      premultipliedAlpha: true,
      alpha: false,
    })
    if (!gl) {
      setState({ glReady: false, error: 'WebGL2 not supported in this browser.' })
      return
    }
    glRef.current = gl

    // Blending for premultiplied alpha
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // ── Renderers ────────────────────────────────────────────────────────────
    let shape: ShapeRenderer, text: TextRenderer
    try {
      shape = new ShapeRenderer(gl)
      text  = new TextRenderer(gl)
      shapeRef.current = shape
      textRef.current  = text
    } catch (err: any) {
      setState({ glReady: false, error: err.message ?? 'Renderer init failed' })
      return
    }

    setState({ glReady: true, error: null })

    // ── Initial canvas size (don't wait for ResizeObserver first tick) ────────
    const applySize = (cssW: number, cssH: number) => {
      if (cssW <= 0 || cssH <= 0) return
      const dpr = window.devicePixelRatio || 1
      canvas.width  = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      cssSizeRef.current = { width: cssW, height: cssH }
      dirtyRef.current = true
    }
    if (canvas.parentElement) {
      const r = canvas.parentElement.getBoundingClientRect()
      applySize(r.width, r.height)
    }

    // ── ResizeObserver ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      applySize(width, height)
    })
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // ── Zustand subscriptions → dirty flag ───────────────────────────────────
    const unsub = useCanvasStore.subscribe(() => { dirtyRef.current = true })

    // ── RAF render loop ──────────────────────────────────────────────────────
    function renderFrame() {
      if (!dirtyRef.current) {
        rafRef.current = requestAnimationFrame(renderFrame)
        return
      }
      dirtyRef.current = false

      const glCtx = glRef.current
      const s = shapeRef.current
      const t = textRef.current
      if (!glCtx || !s || !t) {
        rafRef.current = requestAnimationFrame(renderFrame)
        return
      }

      const store = useCanvasStore.getState()
      const { activePage, viewport } = store
      const { width: cssW, height: cssH } = cssSizeRef.current

      // Clear with page background
      if (activePage?.background) {
        const bg = activePage.background
        glCtx.clearColor(bg.r, bg.g, bg.b, 1)
      } else {
        glCtx.clearColor(0.02, 0.02, 0.031, 1)
      }
      glCtx.clear(glCtx.COLOR_BUFFER_BIT)

      if (activePage?.nodes?.length) {
        s.drawNodes(activePage.nodes, viewport, cssW, cssH)
        t.drawNodes(activePage.nodes, viewport, cssW, cssH)
      }

      rafRef.current = requestAnimationFrame(renderFrame)
    }

    rafRef.current = requestAnimationFrame(renderFrame)

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current)
      unsub()
      ro.disconnect()
      shapeRef.current?.destroy()
      textRef.current?.destroy()
      shapeRef.current = null
      textRef.current  = null
      glRef.current    = null
    }
  }, [canvasRef])

  return state
}

import { TEXT_VERT, TEXT_FRAG } from './shaders'
import type { CanvasNode } from '@/types'

// One GL texture per unique text-style tuple. Cached until style changes.
interface TextEntry {
  texture: WebGLTexture
  texWidth: number
  texHeight: number
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Text shader compile error: ${gl.getShaderInfoLog(shader)}`)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag)
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`Text program link error: ${gl.getProgramInfoLog(prog)}`)
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  return prog
}

function textStyleKey(node: CanvasNode): string {
  const t = node.typography
  if (!t) return `${node.id}||`
  return `${node.characters}|${t.fontFamily}|${t.fontWeight}|${t.fontSize}|${t.color.r},${t.color.g},${t.color.b},${t.color.a}|${node.width}`
}

function colorF(c: number): string {
  return Math.round(c * 255).toString()
}

function renderTextToCanvas(node: CanvasNode): HTMLCanvasElement {
  const t = node.typography
  const offscreen = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  offscreen.width  = Math.max(1, Math.round(node.width  * dpr))
  offscreen.height = Math.max(1, Math.round(node.height * dpr))
  const ctx = offscreen.getContext('2d')!
  ctx.scale(dpr, dpr)

  if (t) {
    ctx.font        = `${t.fontWeight} ${t.fontSize}px "${t.fontFamily}", sans-serif`
    ctx.fillStyle   = `rgba(${colorF(t.color.r)},${colorF(t.color.g)},${colorF(t.color.b)},${t.color.a})`
    ctx.textAlign   = (t.textAlign as CanvasTextAlign) ?? 'left'
    ctx.textBaseline = 'top'

    const lineHeight = typeof t.lineHeight === 'number' ? t.lineHeight : t.fontSize * 1.4
    const text = node.characters ?? ''
    const words = text.split(' ')
    let line = ''
    let y = 0
    const maxW = node.width

    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, 0, y)
        line = word
        y += lineHeight
      } else {
        line = test
      }
    }
    if (line) ctx.fillText(line, 0, y)
  }

  return offscreen
}

// ── Per-quad vertex layout: [x,y,u,v, bounds(4), opacity] ────────────────────
// Simplified: use same instanced approach as ShapeRenderer but with only 6 floats per instance
const FLOATS_PER_TEXT = 6  // x, y, w, h, opacity, _pad

export class TextRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vao: WebGLVertexArrayObject
  private quadVBO: WebGLBuffer
  private instanceVBO: WebGLBuffer
  private cache = new Map<string, TextEntry>()

  private uResolution: WebGLUniformLocation
  private uViewport: WebGLUniformLocation
  private uZoom: WebGLUniformLocation
  private uTexture: WebGLUniformLocation

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.program = createProgram(gl, TEXT_VERT, TEXT_FRAG)
    gl.useProgram(this.program)

    this.uResolution = gl.getUniformLocation(this.program, 'u_resolution')!
    this.uViewport   = gl.getUniformLocation(this.program, 'u_viewport')!
    this.uZoom       = gl.getUniformLocation(this.program, 'u_zoom')!
    this.uTexture    = gl.getUniformLocation(this.program, 'u_texture')!

    const quad = new Float32Array([0,0, 1,0, 1,1, 0,0, 1,1, 0,1])
    this.quadVBO = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO)
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW)

    this.instanceVBO = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(FLOATS_PER_TEXT * 4), gl.DYNAMIC_DRAW)

    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO)
    const stride = FLOATS_PER_TEXT * 4
    gl.enableVertexAttribArray(1)  // a_bounds (x,y,w,h)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0)
    gl.vertexAttribDivisor(1, 1)
    gl.enableVertexAttribArray(2)  // a_opacity
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 16)
    gl.vertexAttribDivisor(2, 1)

    gl.bindVertexArray(null)
  }

  drawNodes(
    nodes: CanvasNode[],
    viewport: { x: number; y: number; zoom: number },
    cssWidth: number,
    cssHeight: number,
  ) {
    const textNodes = this.collectTextNodes(nodes)
    if (!textNodes.length) return

    const gl = this.gl
    gl.useProgram(this.program)
    gl.uniform2f(this.uResolution, cssWidth, cssHeight)
    gl.uniform2f(this.uViewport, viewport.x, viewport.y)
    gl.uniform1f(this.uZoom, viewport.zoom)
    gl.uniform1i(this.uTexture, 0)

    for (const item of textNodes) {
      const { node, absX, absY } = item
      this.drawTextNode(node, absX, absY)
    }
  }

  private drawTextNode(node: CanvasNode, absX: number, absY: number) {
    const gl = this.gl
    const key = textStyleKey(node)

    if (!this.cache.has(key)) {
      const offscreen = renderTextToCanvas(node)
      const tex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreen)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      this.cache.set(key, { texture: tex, texWidth: offscreen.width, texHeight: offscreen.height })
    }

    const entry = this.cache.get(key)!

    // Upload instance data: [x, y, w, h, opacity, pad]
    const inst = new Float32Array([absX, absY, node.width, node.height, node.opacity ?? 1, 0])
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst)

    // Bind texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, entry.texture)

    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1)
    gl.bindVertexArray(null)
  }

  private collectTextNodes(
    nodes: CanvasNode[],
    offsetX = 0,
    offsetY = 0,
    out: Array<{ node: CanvasNode; absX: number; absY: number }> = [],
  ) {
    for (const node of nodes) {
      if (!node.visible) continue
      const absX = offsetX + node.x
      const absY = offsetY + node.y
      if (node.type === 'TEXT') {
        out.push({ node, absX, absY })
      }
      if (node.children?.length) {
        this.collectTextNodes(node.children, absX, absY, out)
      }
    }
    return out
  }

  /** Evict cached texture for a node (call after node content changes) */
  invalidate(node: CanvasNode) {
    const key = textStyleKey(node)
    const entry = this.cache.get(key)
    if (entry) {
      this.gl.deleteTexture(entry.texture)
      this.cache.delete(key)
    }
  }

  destroy() {
    const gl = this.gl
    for (const entry of this.cache.values()) {
      gl.deleteTexture(entry.texture)
    }
    this.cache.clear()
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.quadVBO)
    gl.deleteBuffer(this.instanceVBO)
    gl.deleteProgram(this.program)
  }
}

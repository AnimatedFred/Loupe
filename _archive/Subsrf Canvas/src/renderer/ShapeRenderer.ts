import { SHAPE_VERT, SHAPE_FRAG } from './shaders'
import { GradientRenderer } from './GradientRenderer'
import type { CanvasNode, Fill } from '@/types'

// ── Per-instance float layout (22 floats = 88 bytes) ─────────────────────────
//  0–3   bounds:       x, y, w, h (canvas/design coords)
//  4–7   fillColor:    r, g, b, a  (SOLID)
//  8     cornerRadius
//  9–12  strokeColor:  r, g, b, a
//  13    strokeWidth
//  14    strokeAlign:  0=center 1=inside 2=outside
//  15    fillType:     0=solid 1=linear 2=radial 3=angular 4=image
//  16    opacity
//  17    shapeType:    0=rect 1=ellipse
//  18    gradSlot      (row index in gradient atlas)
//  19    gradAngle     (radians)
//  20–21 gradCenter    (cx, cy, 0–1 within quad)
const FLOATS_PER_INSTANCE = 22
const MAX_INSTANCES = 8192

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`)
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
    throw new Error(`Program link error: ${gl.getProgramInfoLog(prog)}`)
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  return prog
}

interface DrawItem {
  node: CanvasNode
  absX: number
  absY: number
}

function collectDrawList(nodes: CanvasNode[], offsetX = 0, offsetY = 0, out: DrawItem[] = []): DrawItem[] {
  for (const node of nodes) {
    if (!node.visible) continue
    const absX = offsetX + node.x
    const absY = offsetY + node.y
    // Skip pure text nodes here — TextRenderer handles those
    if (node.type !== 'TEXT') {
      out.push({ node, absX, absY })
    }
    if (node.children?.length) {
      collectDrawList(node.children, absX, absY, out)
    }
  }
  return out
}

export class ShapeRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vao: WebGLVertexArrayObject
  private quadVBO: WebGLBuffer
  private instanceVBO: WebGLBuffer
  private instanceData: Float32Array
  private gradientRenderer: GradientRenderer

  // Uniform locations
  private uResolution: WebGLUniformLocation
  private uViewport: WebGLUniformLocation
  private uZoom: WebGLUniformLocation
  private uGradAtlas: WebGLUniformLocation
  private uGradAtlasRows: WebGLUniformLocation

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.gradientRenderer = new GradientRenderer(gl)
    this.instanceData = new Float32Array(MAX_INSTANCES * FLOATS_PER_INSTANCE)

    this.program = createProgram(gl, SHAPE_VERT, SHAPE_FRAG)
    gl.useProgram(this.program)

    // Uniform locations
    this.uResolution    = gl.getUniformLocation(this.program, 'u_resolution')!
    this.uViewport      = gl.getUniformLocation(this.program, 'u_viewport')!
    this.uZoom          = gl.getUniformLocation(this.program, 'u_zoom')!
    this.uGradAtlas     = gl.getUniformLocation(this.program, 'u_gradAtlas')!
    this.uGradAtlasRows = gl.getUniformLocation(this.program, 'u_gradAtlasRows')!

    // Unit quad (6 vertices covering (0,0)→(1,1))
    const quadVerts = new Float32Array([
      0,0, 1,0, 1,1,
      0,0, 1,1, 0,1,
    ])
    this.quadVBO = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO)
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW)

    this.instanceVBO = gl.createBuffer()!
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)

    // ── Per-vertex attributes (divisor 0) ────────────────────────────────────
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(0, 0)

    // ── Per-instance attributes (divisor 1) ──────────────────────────────────
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO)
    // Allocate the buffer up-front (will be overwritten each frame)
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData, gl.DYNAMIC_DRAW)

    const stride = FLOATS_PER_INSTANCE * 4
    const addAttr = (loc: number, size: number, offset: number) => {
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4)
      gl.vertexAttribDivisor(loc, 1)
    }

    addAttr(1,  4, 0)   // a_bounds
    addAttr(2,  4, 4)   // a_fillColor
    addAttr(3,  1, 8)   // a_cornerRadius
    addAttr(4,  4, 9)   // a_strokeColor
    addAttr(5,  1, 13)  // a_strokeWidth
    addAttr(6,  1, 14)  // a_strokeAlign
    addAttr(7,  1, 15)  // a_fillType
    addAttr(8,  1, 16)  // a_opacity
    addAttr(9,  1, 17)  // a_shapeType
    addAttr(10, 1, 18)  // a_gradSlot
    addAttr(11, 1, 19)  // a_gradAngle
    addAttr(12, 2, 20)  // a_gradCenter

    gl.bindVertexArray(null)
  }

  drawNodes(
    nodes: CanvasNode[],
    viewport: { x: number; y: number; zoom: number },
    cssWidth: number,
    cssHeight: number,
  ) {
    const gl = this.gl
    const drawList = collectDrawList(nodes)
    if (!drawList.length) return

    // Build instance buffer
    let count = 0
    for (const item of drawList) {
      if (count >= MAX_INSTANCES) break
      this.writeInstance(item.node, item.absX, item.absY, count)
      count++
    }

    if (count === 0) return

    gl.useProgram(this.program)

    // Upload instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceVBO)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceData, 0, count * FLOATS_PER_INSTANCE)

    // Bind gradient atlas to texture unit 0
    this.gradientRenderer.bind(0)
    gl.uniform1i(this.uGradAtlas, 0)
    gl.uniform1f(this.uGradAtlasRows, this.gradientRenderer.rows)

    // Set viewport uniforms
    gl.uniform2f(this.uResolution, cssWidth, cssHeight)
    gl.uniform2f(this.uViewport, viewport.x, viewport.y)
    gl.uniform1f(this.uZoom, viewport.zoom)

    // Draw
    gl.bindVertexArray(this.vao)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count)
    gl.bindVertexArray(null)
  }

  private writeInstance(node: CanvasNode, absX: number, absY: number, idx: number) {
    const d = this.instanceData
    const o = idx * FLOATS_PER_INSTANCE

    const fill   = node.fills?.[0] ?? null
    const stroke = node.strokes?.[0] ?? null

    // Bounds
    d[o + 0] = absX
    d[o + 1] = absY
    d[o + 2] = node.width
    d[o + 3] = node.height

    // Fill color (used for SOLID; gradient path ignores these)
    const fc = (fill?.type === 'SOLID' && fill.color) ? fill.color : null
    d[o + 4] = fc?.r ?? 0
    d[o + 5] = fc?.g ?? 0
    d[o + 6] = fc?.b ?? 0
    d[o + 7] = fill ? (fc?.a ?? 1) : 0

    // Corner radius
    d[o + 8] = node.cornerRadius ?? 0

    // Stroke
    const sc = stroke?.color
    d[o + 9]  = sc?.r ?? 0
    d[o + 10] = sc?.g ?? 0
    d[o + 11] = sc?.b ?? 0
    d[o + 12] = sc?.a ?? 0
    d[o + 13] = stroke?.weight ?? 0

    const alignMap: Record<string, number> = { CENTER: 0, INSIDE: 1, OUTSIDE: 2 }
    d[o + 14] = alignMap[stroke?.position ?? 'CENTER'] ?? 0

    // Fill type
    const typeMap: Record<string, number> = {
      SOLID: 0, GRADIENT_LINEAR: 1, GRADIENT_RADIAL: 2, GRADIENT_ANGULAR: 3, IMAGE: 4,
    }
    d[o + 15] = fill ? (typeMap[fill.type] ?? 0) : 0

    // Opacity
    d[o + 16] = node.opacity ?? 1

    // Shape type (ellipse vs rect)
    d[o + 17] = node.type === 'ELLIPSE' ? 1 : 0

    // Gradient atlas slot
    if (fill && fill.type !== 'SOLID' && fill.type !== 'IMAGE' && fill.gradientStops) {
      d[o + 18] = this.gradientRenderer.getSlot(fill)
    } else {
      d[o + 18] = 0
    }

    // Gradient angle (degrees → radians)
    d[o + 19] = ((fill as Fill | null)?.gradientAngle ?? 135) * (Math.PI / 180)

    // Gradient center (0.5, 0.5 default — center of the quad)
    d[o + 20] = 0.5
    d[o + 21] = 0.5
  }

  destroy() {
    const gl = this.gl
    this.gradientRenderer.destroy()
    gl.deleteVertexArray(this.vao)
    gl.deleteBuffer(this.quadVBO)
    gl.deleteBuffer(this.instanceVBO)
    gl.deleteProgram(this.program)
  }
}

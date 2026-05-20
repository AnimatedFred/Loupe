import type { Fill } from '@/types'

const ATLAS_WIDTH = 256
const ATLAS_ROWS  = 64  // max 64 distinct gradients cached

function bakeGradientRow(fill: Fill): Uint8Array {
  const stops = fill.gradientStops ?? []
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const data = new Uint8Array(ATLAS_WIDTH * 4)

  for (let i = 0; i < ATLAS_WIDTH; i++) {
    const t = i / (ATLAS_WIDTH - 1)

    // Find surrounding stops
    let lo = sorted[0]
    let hi = sorted[sorted.length - 1]
    for (let j = 0; j < sorted.length - 1; j++) {
      if (t >= sorted[j].position && t <= sorted[j + 1].position) {
        lo = sorted[j]
        hi = sorted[j + 1]
        break
      }
    }

    const span = hi.position - lo.position
    const f = span < 0.001 ? 0 : (t - lo.position) / span
    const r = lo.color.r + (hi.color.r - lo.color.r) * f
    const g = lo.color.g + (hi.color.g - lo.color.g) * f
    const b = lo.color.b + (hi.color.b - lo.color.b) * f
    const a = lo.color.a + (hi.color.a - lo.color.a) * f

    data[i * 4]     = Math.round(r * 255)
    data[i * 4 + 1] = Math.round(g * 255)
    data[i * 4 + 2] = Math.round(b * 255)
    data[i * 4 + 3] = Math.round(a * 255)
  }
  return data
}

export class GradientRenderer {
  private gl: WebGL2RenderingContext
  private texture: WebGLTexture
  private slotMap = new Map<string, number>()
  private nextSlot = 0

  readonly rows = ATLAS_ROWS

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl

    const tex = gl.createTexture()
    if (!tex) throw new Error('Failed to create gradient atlas texture')
    this.texture = tex

    // Allocate the full atlas upfront (zeroed)
    const empty = new Uint8Array(ATLAS_WIDTH * ATLAS_ROWS * 4)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ATLAS_WIDTH, ATLAS_ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, empty)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  /** Returns atlas row index for the given fill. Bakes + uploads if not cached. */
  getSlot(fill: Fill): number {
    if (!fill.gradientStops?.length) return 0
    const key = JSON.stringify(fill.gradientStops)
    if (this.slotMap.has(key)) return this.slotMap.get(key)!

    const slot = this.nextSlot % ATLAS_ROWS
    this.nextSlot++
    this.slotMap.set(key, slot)

    const row = bakeGradientRow(fill)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
    this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, slot, ATLAS_WIDTH, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, row)
    return slot
  }

  bind(textureUnit: number) {
    this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
  }

  destroy() {
    this.gl.deleteTexture(this.texture)
  }
}

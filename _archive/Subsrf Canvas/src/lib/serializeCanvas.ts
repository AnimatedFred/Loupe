import type { CanvasNode, Color } from '@/types'

function hex(c: Color): string {
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0')
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0')
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

function serializeNode(node: CanvasNode, depth: number): string {
  const indent = '  '.repeat(depth)
  const parts: string[] = []

  let line = `${indent}${node.type} "${node.name}" (${node.width}×${node.height})`
  if (node.x !== undefined) line += ` at (${Math.round(node.x)},${Math.round(node.y)})`
  parts.push(line)

  const details: string[] = []

  const fill = node.fills?.[0]
  if (fill?.type === 'SOLID' && fill.color) {
    details.push(`fill: ${hex(fill.color)}`)
  } else if (fill?.type?.startsWith('GRADIENT')) {
    details.push(`fill: ${fill.type.toLowerCase().replace('gradient_', '')} gradient`)
  }

  if (node.cornerRadius) details.push(`radius: ${node.cornerRadius}px`)
  if (node.opacity !== undefined && node.opacity !== 1) details.push(`opacity: ${node.opacity}`)

  const stroke = node.strokes?.[0]
  if (stroke) details.push(`stroke: ${hex(stroke.color)} ${stroke.weight}px`)

  if (node.type === 'TEXT' && node.characters) {
    details.push(`text: "${node.characters.slice(0, 80)}${node.characters.length > 80 ? '…' : ''}"`)
  }

  if (node.typography) {
    const t = node.typography
    details.push(`font: ${t.fontWeight} ${t.fontSize}px ${t.fontFamily}, color: ${hex(t.color)}`)
  }

  if (details.length) {
    parts.push(`${indent}  ${details.join(', ')}`)
  }

  if (node.children?.length) {
    parts.push(`${indent}  children:`)
    for (const child of node.children) {
      parts.push(serializeNode(child, depth + 2))
    }
  }

  return parts.join('\n')
}

export function serializeCanvasContext(nodes: CanvasNode[], pageName: string): string {
  const lines = [`Design context — Page: "${pageName}"\n`]
  for (const node of nodes) {
    lines.push(serializeNode(node, 0))
  }
  return lines.join('\n')
}

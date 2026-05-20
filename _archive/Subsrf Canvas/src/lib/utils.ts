import { nanoid } from 'nanoid'
import type { CanvasNode, Color, Fill, DesignToken, ConstraintViolation, GeneratedCode } from '@/types'

// ── Color utilities ───────────────────────────────────────────────────────

export function colorToHex(c: Color): string {
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0')
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0')
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

export function colorToRgba(c: Color): string {
  const r = Math.round(c.r * 255)
  const g = Math.round(c.g * 255)
  const b = Math.round(c.b * 255)
  if (c.a === 1) return `rgb(${r},${g},${b})`
  return `rgba(${r},${g},${b},${c.a})`
}

export function hexToColor(hex: string): Color {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: 1,
  }
}

export function cssToColor(css: string): Color | null {
  if (css.startsWith('#')) return hexToColor(css)
  const match = css.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)/)
  if (match) {
    return {
      r: parseFloat(match[1]) / 255,
      g: parseFloat(match[2]) / 255,
      b: parseFloat(match[3]) / 255,
      a: match[4] !== undefined ? parseFloat(match[4]) : 1,
    }
  }
  return null
}

export function colorToFigma(c: Color) {
  return { r: c.r, g: c.g, b: c.b, a: c.a }
}

// ── CIELAB / Delta E ──────────────────────────────────────────────────────

function linearize(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function rgbToXyz(c: Color): [number, number, number] {
  const r = linearize(c.r)
  const g = linearize(c.g)
  const b = linearize(c.b)
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  ]
}

function xyzToLab([x, y, z]: [number, number, number]): [number, number, number] {
  const ref = [0.95047, 1.00000, 1.08883]
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
  const fx = f(x / ref[0]), fy = f(y / ref[1]), fz = f(z / ref[2])
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function deltaE(a: Color, b: Color): number {
  const [L1, a1, b1] = xyzToLab(rgbToXyz(a))
  const [L2, a2, b2] = xyzToLab(rgbToXyz(b))
  return Math.sqrt((L2 - L1) ** 2 + (a2 - a1) ** 2 + (b2 - b1) ** 2)
}

// ── Contrast ratio (WCAG) ─────────────────────────────────────────────────

function relativeLuminance(c: Color): number {
  const r = linearize(c.r)
  const g = linearize(c.g)
  const b = linearize(c.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(fg: Color, bg: Color): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

export function passesWCAGAA(fg: Color, bg: Color, isLargeText = false): boolean {
  const ratio = contrastRatio(fg, bg)
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

export function passesWCAGAAA(fg: Color, bg: Color, isLargeText = false): boolean {
  const ratio = contrastRatio(fg, bg)
  return isLargeText ? ratio >= 4.5 : ratio >= 7
}

// ── Token matching ────────────────────────────────────────────────────────

export function findClosestToken(value: string, tokens: DesignToken[], category: string): DesignToken | null {
  const cat = tokens.filter(t => t.category === category)
  if (cat.length === 0) return null

  if (category === 'color') {
    const c = cssToColor(value)
    if (!c) return null
    let best: DesignToken | null = null
    let bestDelta = Infinity
    for (const t of cat) {
      const tc = cssToColor(t.value as string)
      if (!tc) continue
      const d = deltaE(c, tc)
      if (d < bestDelta) { bestDelta = d; best = t }
    }
    return bestDelta < 5 ? best : null
  }

  return cat.find(t => String(t.value) === value) ?? null
}

export function colorMatchesToken(color: Color, tokens: DesignToken[]): string | null {
  const hex = colorToHex(color)
  const token = findClosestToken(hex, tokens, 'color')
  return token?.name ?? null
}

export function spacingMatchesToken(px: number, tokens: DesignToken[]): string | null {
  const token = tokens.find(t => t.category === 'spacing' && t.value === `${px}px`)
  return token?.name ?? null
}

export function fontSizeMatchesToken(px: number, tokens: DesignToken[]): string | null {
  const token = tokens.find(t => t.category === 'typography' && t.value === `${px}px`)
  return token?.name ?? null
}

// ── Grid snapping ─────────────────────────────────────────────────────────

export function snapToGrid(value: number, gridSize = 4): number {
  return Math.round(value / gridSize) * gridSize
}

export function isOnGrid(value: number, gridSize = 4): boolean {
  return value % gridSize === 0
}

// ── CSS selector generation ───────────────────────────────────────────────

export function generateCSSSelector(node: CanvasNode): string {
  const name = node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `.${name}`
}

export function generateXPath(node: CanvasNode, index = 0): string {
  const tag = nodeTypeToHTMLTag(node.type)
  const name = node.name.toLowerCase().replace(/\s+/g, '-')
  if (node.type === 'TEXT') return `//span[@class="${name}"]`
  return `//${tag}[@class="${name}"][${index + 1}]`
}

export function nodeTypeToHTMLTag(type: CanvasNode['type']): string {
  const map: Record<string, string> = {
    FRAME: 'div', COMPONENT: 'div', COMPONENT_INSTANCE: 'div',
    RECTANGLE: 'div', ELLIPSE: 'div', TEXT: 'span',
    IMAGE: 'img', GROUP: 'div', LINE: 'hr', ARROW: 'div', VECTOR: 'svg',
  }
  return map[type] ?? 'div'
}

// ── Tailwind class generation ─────────────────────────────────────────────

export function colorToTailwind(color: Color, tokens: DesignToken[], prefix: 'bg' | 'text' | 'border'): string {
  const tokenName = colorMatchesToken(color, tokens)
  if (tokenName) {
    const tw = tokenName.replace('color/', '').replace(/\//g, '-')
    return `${prefix}-${tw}`
  }
  return `${prefix}-[${colorToHex(color)}]`
}

export function spacingToTailwind(px: number, prop: 'p' | 'm' | 'gap' | 'w' | 'h', tokens: DesignToken[]): string {
  const tokenName = spacingMatchesToken(px, tokens)
  if (tokenName) {
    const scale = tokenName.replace('space/', '')
    return `${prop}-${scale}`
  }
  return `${prop}-[${px}px]`
}

export function radiusToTailwind(px: number): string {
  if (px === 0)    return 'rounded-none'
  if (px <= 4)     return 'rounded-sm'
  if (px <= 8)     return 'rounded-md'
  if (px <= 16)    return 'rounded-lg'
  if (px >= 9999)  return 'rounded-full'
  return `rounded-[${px}px]`
}

// ── Code generation ───────────────────────────────────────────────────────

export function generateNodeCode(
  node: CanvasNode,
  tokens: DesignToken[],
  framework: 'react-tailwind' | 'react-css' | 'vue-tailwind' | 'html-css' = 'react-tailwind',
): GeneratedCode {
  if (framework === 'react-tailwind') return generateReactTailwind(node, tokens)
  if (framework === 'react-css')      return generateReactCSS(node, tokens)
  return generateHTML(node, tokens)
}

function generateReactTailwind(node: CanvasNode, tokens: DesignToken[]): GeneratedCode {
  const tag = nodeTypeToHTMLTag(node.type)
  const className = buildTailwindClasses(node, tokens)
  const name = toPascalCase(node.name)

  const props = node.subsurface?.props ?? []
  const propsInterface = props.length > 0
    ? `interface ${name}Props {\n${props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.type}`).join('\n')}\n}\n\n`
    : ''

  const propsParam = props.length > 0
    ? `{ ${props.map(p => p.name).join(', ')} }: ${name}Props`
    : ''

  const children = node.children && node.children.length > 0
    ? node.children.map(child => {
        const childCode = generateReactTailwind(child, tokens)
        return '  ' + childCode.jsx.split('\n').join('\n  ')
      }).join('\n')
    : node.characters ? `  {${node.type === 'TEXT' ? `'${node.characters}'` : 'children'}}` : ''

  const jsx = node.type === 'TEXT'
    ? `<${tag} className="${className}">${node.characters ?? '{children}'}</${tag}>`
    : children
      ? `<${tag} className="${className}">\n${children}\n</${tag}>`
      : `<${tag} className="${className}" />`

  const componentJsx = props.length > 0
    ? `${propsInterface}export function ${name}(${propsParam}) {\n  return (\n    ${jsx.split('\n').join('\n    ')}\n  )\n}`
    : jsx

  return {
    jsx: componentJsx,
    props: propsInterface || `// No props defined for ${name}`,
  }
}

function generateReactCSS(node: CanvasNode, tokens: DesignToken[]): GeneratedCode {
  const name = toPascalCase(node.name)
  const className = toKebabCase(node.name)
  const css = buildCSSRules(node, tokens, `.${className}`)

  const jsx = `<div className={styles.${toCamelCase(node.name)}}>\n  {children}\n</div>`
  return {
    jsx: `export function ${name}({ children }: { children?: React.ReactNode }) {\n  return (\n    ${jsx}\n  )\n}`,
    css,
    props: `// Props for ${name}`,
  }
}

function generateHTML(node: CanvasNode, tokens: DesignToken[]): GeneratedCode {
  const className = toKebabCase(node.name)
  const css = buildCSSRules(node, tokens, `.${className}`)
  const tag = nodeTypeToHTMLTag(node.type)
  return {
    jsx: `<${tag} class="${className}">${node.characters ?? ''}</${tag}>`,
    css,
    props: '',
  }
}

function buildTailwindClasses(node: CanvasNode, tokens: DesignToken[]): string {
  const classes: string[] = []

  if (node.type !== 'TEXT') {
    classes.push(`w-[${node.width}px]`, `h-[${node.height}px]`)
  }

  const fill = node.fills?.[0]
  if (fill?.type === 'SOLID' && fill.color) {
    classes.push(colorToTailwind(fill.color, tokens, 'bg'))
  }

  if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
    classes.push(radiusToTailwind(node.cornerRadius))
  }

  if (node.autoLayout) {
    const al = node.autoLayout
    if (al.mode !== 'NONE') {
      classes.push('flex')
      if (al.mode === 'HORIZONTAL') classes.push('flex-row')
      if (al.mode === 'VERTICAL')   classes.push('flex-col')
      if (al.gap > 0)               classes.push(spacingToTailwind(al.gap, 'gap', tokens))

      const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = al
      if (pt === pb && pr === pl) {
        if (pt === pr) classes.push(spacingToTailwind(pt, 'p', tokens))
        else { classes.push(`py-[${pt}px]`, `px-[${pr}px]`) }
      } else {
        if (pt > 0) classes.push(`pt-[${pt}px]`)
        if (pr > 0) classes.push(`pr-[${pr}px]`)
        if (pb > 0) classes.push(`pb-[${pb}px]`)
        if (pl > 0) classes.push(`pl-[${pl}px]`)
      }

      if (al.primaryAxis === 'CENTER')        classes.push('justify-center')
      if (al.primaryAxis === 'END')           classes.push('justify-end')
      if (al.primaryAxis === 'SPACE_BETWEEN') classes.push('justify-between')
      if (al.counterAxis === 'CENTER')        classes.push('items-center')
      if (al.counterAxis === 'END')           classes.push('items-end')
      if (al.counterAxis === 'STRETCH')       classes.push('items-stretch')
    }
  }

  if (node.opacity !== undefined && node.opacity < 1) {
    classes.push(`opacity-[${Math.round(node.opacity * 100)}%]`)
  }

  if (node.type === 'TEXT' && node.typography) {
    const t = node.typography
    classes.push(colorToTailwind(t.color, tokens, 'text'))
    classes.push(fontSizeToTailwind(t.fontSize))
    classes.push(fontWeightToTailwind(t.fontWeight))
    if (t.lineHeight !== 1) classes.push(`leading-[${t.lineHeight}]`)
    if (t.letterSpacing !== 0) classes.push(`tracking-[${t.letterSpacing}px]`)
    if (t.textAlign !== 'left') classes.push(`text-${t.textAlign}`)
  }

  const stroke = node.strokes?.[0]
  if (stroke) {
    classes.push('border')
    if (stroke.weight !== 1) classes.push(`border-[${stroke.weight}px]`)
    classes.push(colorToTailwind(stroke.color, tokens, 'border'))
  }

  if (node.clipContent) classes.push('overflow-hidden')

  return classes.filter(Boolean).join(' ')
}

function buildCSSRules(node: CanvasNode, tokens: DesignToken[], selector: string): string {
  const rules: string[] = []

  const fill = node.fills?.[0]
  if (fill?.type === 'SOLID' && fill.color) {
    const tokenName = colorMatchesToken(fill.color, tokens)
    rules.push(`  background-color: ${tokenName ? `var(--${tokenName.replace(/\//g, '-')})` : colorToRgba(fill.color)};`)
  }

  if (node.cornerRadius) rules.push(`  border-radius: ${node.cornerRadius}px;`)

  if (node.autoLayout) {
    const al = node.autoLayout
    if (al.mode !== 'NONE') {
      rules.push('  display: flex;')
      rules.push(`  flex-direction: ${al.mode === 'HORIZONTAL' ? 'row' : 'column'};`)
      if (al.gap) rules.push(`  gap: ${al.gap}px;`)
      rules.push(`  padding: ${al.paddingTop}px ${al.paddingRight}px ${al.paddingBottom}px ${al.paddingLeft}px;`)
    }
  }

  if (node.opacity !== undefined && node.opacity < 1) rules.push(`  opacity: ${node.opacity};`)

  const stroke = node.strokes?.[0]
  if (stroke) {
    rules.push(`  border: ${stroke.weight}px solid ${colorToRgba(stroke.color)};`)
  }

  const shadow = node.shadows?.[0]
  if (shadow) {
    rules.push(`  box-shadow: ${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${colorToRgba(shadow.color)};`)
  }

  return `${selector} {\n${rules.join('\n')}\n}`
}

function fontSizeToTailwind(px: number): string {
  const map: Record<number, string> = {
    12: 'text-xs', 14: 'text-sm', 16: 'text-base', 18: 'text-lg',
    20: 'text-xl', 24: 'text-2xl', 30: 'text-3xl', 36: 'text-4xl',
    48: 'text-5xl', 60: 'text-6xl',
  }
  return map[px] ?? `text-[${px}px]`
}

function fontWeightToTailwind(w: number): string {
  const map: Record<number, string> = {
    100: 'font-thin', 200: 'font-extralight', 300: 'font-light', 400: 'font-normal',
    500: 'font-medium', 600: 'font-semibold', 700: 'font-bold', 800: 'font-extrabold', 900: 'font-black',
  }
  return map[w] ?? `font-[${w}]`
}

// ── Linter ────────────────────────────────────────────────────────────────

export function runLinter(nodes: CanvasNode[], tokens: DesignToken[]): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []
  runLinterOnNodes(nodes, tokens, violations)
  return violations
}

function runLinterOnNodes(nodes: CanvasNode[], tokens: DesignToken[], violations: ConstraintViolation[]) {
  for (const node of nodes) {
    if (isInteractive(node) && (node.width < 44 || node.height < 44)) {
      violations.push({
        id: `${node.id}-touch`, nodeId: node.id, severity: 'critical', rule: 'touch-target',
        message: `"${node.name}" is ${node.width}×${node.height}px — interactive elements must be at least 44×44px`,
        fix: 'Resize to 44×44px minimum', autoFixable: true,
      })
    }

    const fill = node.fills?.[0]
    if (fill?.type === 'SOLID' && fill.color) {
      const match = colorMatchesToken(fill.color, tokens)
      if (!match) {
        violations.push({
          id: `${node.id}-color`, nodeId: node.id, severity: 'warning', rule: 'off-token-color',
          message: `"${node.name}" uses color ${colorToHex(fill.color)} which is not in the token set`,
          fix: 'Assign closest token or add to token set', autoFixable: false,
        })
      }
    }

    if (node.type === 'TEXT' && node.typography) {
      const ratio = contrastRatio(node.typography.color, { r: 0.02, g: 0.02, b: 0.031, a: 1 })
      if (ratio < 4.5) {
        violations.push({
          id: `${node.id}-contrast`, nodeId: node.id, severity: 'critical', rule: 'contrast-aa',
          message: `"${node.name}" contrast ratio is ${ratio.toFixed(1)}:1 — WCAG AA requires 4.5:1`,
          fix: 'Lighten text color to improve contrast', autoFixable: false,
        })
      }
    }

    if (node.autoLayout) {
      const al = node.autoLayout
      const offGridValues = [al.gap, al.paddingTop, al.paddingRight, al.paddingBottom, al.paddingLeft]
        .filter(v => v > 0 && !isOnGrid(v))
      if (offGridValues.length > 0) {
        violations.push({
          id: `${node.id}-grid`, nodeId: node.id, severity: 'warning', rule: 'off-grid',
          message: `"${node.name}" has spacing values off the 4px grid: ${offGridValues.join(', ')}px`,
          fix: 'Snap to nearest 4px value', autoFixable: true,
        })
      }
    }

    if (node.type === 'IMAGE' && !node.characters) {
      violations.push({
        id: `${node.id}-alt`, nodeId: node.id, severity: 'critical', rule: 'missing-alt',
        message: `Image "${node.name}" has no alt text / description`,
        fix: 'Add description in the element properties', autoFixable: false,
      })
    }

    if (node.typography) {
      const match = fontSizeMatchesToken(node.typography.fontSize, tokens)
      if (!match) {
        violations.push({
          id: `${node.id}-fontsize`, nodeId: node.id, severity: 'warning', rule: 'off-token-type',
          message: `"${node.name}" uses font-size ${node.typography.fontSize}px which is not on the type scale`,
          fix: 'Use a token-defined font size', autoFixable: false,
        })
      }
    }

    if (node.children) runLinterOnNodes(node.children, tokens, violations)
  }
}

function isInteractive(node: CanvasNode): boolean {
  const interactiveNames = ['button', 'btn', 'link', 'input', 'toggle', 'checkbox', 'radio', 'switch', 'tab', 'chip']
  const name = node.name.toLowerCase()
  return interactiveNames.some(k => name.includes(k))
}

// ── Subsurface data ───────────────────────────────────────────────────────

export function generateSubsurfaceData(node: CanvasNode, tokens: DesignToken[]) {
  const tokenRefs: Record<string, string> = {}

  const fill = node.fills?.[0]
  if (fill?.type === 'SOLID' && fill.color) {
    const match = colorMatchesToken(fill.color, tokens)
    if (match) tokenRefs['background'] = match
  }

  if (node.typography) {
    const fsMatch = fontSizeMatchesToken(node.typography.fontSize, tokens)
    if (fsMatch) tokenRefs['font-size'] = fsMatch
    const colorMatch = colorMatchesToken(node.typography.color, tokens)
    if (colorMatch) tokenRefs['color'] = colorMatch
  }

  if (node.cornerRadius) {
    const rMatch = tokens.find(t => t.category === 'radius' && t.value === `${node.cornerRadius}px`)
    if (rMatch) tokenRefs['border-radius'] = rMatch.name
  }

  if (node.autoLayout) {
    const gapMatch = spacingMatchesToken(node.autoLayout.gap, tokens)
    if (gapMatch) tokenRefs['gap'] = gapMatch
    const padMatch = spacingMatchesToken(node.autoLayout.paddingTop, tokens)
    if (padMatch) tokenRefs['padding'] = padMatch
  }

  let contrastRatioVal: number | undefined
  let contrastPass: boolean | undefined
  if (node.type === 'TEXT' && node.typography) {
    const bgColor = { r: 0.02, g: 0.02, b: 0.031, a: 1 }
    contrastRatioVal = contrastRatio(node.typography.color, bgColor)
    contrastPass = contrastRatioVal >= 4.5
  }

  return {
    cssSelector: generateCSSSelector(node),
    xpath: generateXPath(node),
    tokenRefs,
    contrastRatio: contrastRatioVal,
    contrastPass,
  }
}

// ── String helpers ────────────────────────────────────────────────────────

export function toPascalCase(str: string): string {
  return str.replace(/(?:^|\s|[-_/])(\w)/g, (_, c) => c.toUpperCase()).replace(/\s+/g, '')
}

export function toCamelCase(str: string): string {
  const pc = toPascalCase(str)
  return pc.charAt(0).toLowerCase() + pc.slice(1)
}

export function toKebabCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ── Node factory helpers ──────────────────────────────────────────────────

export function makeFrame(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: nanoid(),
    name: 'Frame',
    type: 'FRAME',
    x: 100, y: 100,
    width: 380, height: 240,
    opacity: 1, visible: true, locked: false,
    fills: [{ type: 'SOLID', color: { r: 0.055, g: 0.055, b: 0.094, a: 1 } }],
    strokes: [{ color: { r: 1, g: 1, b: 1, a: 0.06 }, weight: 1, position: 'INSIDE' }],
    shadows: [],
    cornerRadius: 10,
    clipContent: true,
    children: [],
    ...overrides,
  }
}

export function makeText(text: string, overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: nanoid(),
    name: text.slice(0, 30),
    type: 'TEXT',
    x: 0, y: 0,
    width: 200, height: 24,
    opacity: 1, visible: true, locked: false,
    fills: [],
    strokes: [],
    shadows: [],
    characters: text,
    typography: {
      fontFamily: 'Manrope, sans-serif',
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: 0,
      textAlign: 'left',
      color: { r: 0.949, g: 0.949, b: 0.957, a: 1 },
    },
    ...overrides,
  }
}

export function makeRect(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: nanoid(),
    name: 'Rectangle',
    type: 'RECTANGLE',
    x: 0, y: 0,
    width: 100, height: 60,
    opacity: 1, visible: true, locked: false,
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.55, a: 1 } }],
    strokes: [],
    shadows: [],
    cornerRadius: 8,
    ...overrides,
  }
}

export function makeButton(label: string, primary = true): CanvasNode {
  return {
    id: nanoid(),
    name: primary ? 'PrimaryButton' : 'SecondaryButton',
    type: 'FRAME',
    x: 0, y: 0,
    width: 140, height: 44,
    opacity: 1, visible: true, locked: false,
    fills: primary
      ? [{ type: 'SOLID', color: { r: 0, g: 1, b: 0.529, a: 1 }, tokenName: 'color/accent' }]
      : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.06 } }],
    strokes: primary ? [] : [{ color: { r: 1, g: 1, b: 1, a: 0.10 }, weight: 1, position: 'INSIDE' }],
    shadows: [],
    cornerRadius: 6,
    autoLayout: {
      mode: 'HORIZONTAL', gap: 8,
      paddingTop: 10, paddingRight: 20, paddingBottom: 10, paddingLeft: 20,
      primaryAxis: 'CENTER', counterAxis: 'CENTER',
    },
    children: [makeText(label, {
      typography: {
        fontFamily: 'Azeret Mono, monospace',
        fontSize: 13, fontWeight: 600,
        lineHeight: 1, letterSpacing: 0.5,
        textAlign: 'center',
        color: primary ? { r: 0.02, g: 0.02, b: 0.031, a: 1 } : { r: 0.94, g: 0.94, b: 0.957, a: 1 },
      },
    })],
    intentTag: { type: primary ? 'PRIMARY_CTA' : 'SECONDARY_ACTION' },
  }
}

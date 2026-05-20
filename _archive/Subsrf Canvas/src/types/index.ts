// ── Primitives ────────────────────────────────────────────────────────────

export interface Color {
  r: number
  g: number
  b: number
  a: number
}

export interface GradientStop {
  color: Color
  position: number
}

export interface Fill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'IMAGE'
  color?: Color
  gradientStops?: GradientStop[]
  gradientAngle?: number
  imageUrl?: string
  tokenName?: string
}

export interface Stroke {
  color: Color
  weight: number
  position: 'INSIDE' | 'OUTSIDE' | 'CENTER'
}

export interface Shadow {
  type?: 'DROP_SHADOW' | 'INNER_SHADOW'
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: Color
}

export interface AutoLayout {
  mode: 'HORIZONTAL' | 'VERTICAL' | 'GRID' | 'NONE'
  gap: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  primaryAxis: 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN'
  counterAxis: 'START' | 'CENTER' | 'END' | 'STRETCH'
  wrap?: boolean
  minWidth?: number
  maxWidth?: number
}

export interface Typography {
  fontFamily: string
  fontSize: number
  fontWeight: number
  lineHeight: number
  letterSpacing: number
  textAlign: 'left' | 'center' | 'right' | 'justify'
  color: Color
}

export interface SubsurfaceData {
  cssSelector?: string
  xpath?: string
  tokenRefs?: Record<string, string>
  contrastRatio?: number
  contrastPass?: boolean
  props?: Array<{ name: string; type: string; required: boolean; default?: string }>
}

export interface ResponsiveRule {
  breakpoint: number
  property: string
  value: unknown
}

export interface NodeAnalytics {
  clickRate?: number
  heatmapUrl?: string
}

export type NodeType =
  | 'FRAME'
  | 'COMPONENT'
  | 'COMPONENT_INSTANCE'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'IMAGE'
  | 'GROUP'
  | 'LINE'
  | 'ARROW'
  | 'VECTOR'

export interface IntentTag {
  type: 'PRIMARY_CTA' | 'SECONDARY_ACTION' | 'DECORATIVE' | 'NAVIGATION' | 'DATA_DISPLAY' | 'EMPTY_STATE' | 'ERROR_STATE'
}

// ── Canvas node ────────────────────────────────────────────────────────────

export interface CanvasNode {
  id: string
  name: string
  type: NodeType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  opacity: number
  visible: boolean
  locked: boolean
  fills: Fill[]
  strokes: Stroke[]
  shadows: Shadow[]
  cornerRadius?: number
  clipContent?: boolean
  children?: CanvasNode[]
  autoLayout?: AutoLayout
  typography?: Typography
  characters?: string
  componentId?: string
  codeRef?: { componentName: string; file: string }
  intentTag?: IntentTag
  subsurface?: SubsurfaceData
  dataBindings?: Record<string, { sourceId: string; field: string }>
  responsiveRules?: ResponsiveRule[]
  analytics?: NodeAnalytics
}

// ── Page / File ───────────────────────────────────────────────────────────

export interface CanvasPage {
  id: string
  name: string
  route: string
  nodes: CanvasNode[]
  background: Color
  viewport: { x: number; y: number; zoom: number }
}

export interface DesignToken {
  name: string
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'transition'
  value: string | number
  description?: string
}

export interface TokenSet {
  id: string
  name: string
  tokens: DesignToken[]
  sourceUrl?: string
  extractedAt?: string
}

export interface ComponentVariant {
  id: string
  name: string
  properties: Record<string, string>
  overrides: Record<string, unknown>
}

export interface ComponentProp {
  name: string
  type: string
  required: boolean
  default?: unknown
}

export interface ComponentDefinition {
  id: string
  name: string
  description: string
  rootNode: CanvasNode
  variants: ComponentVariant[]
  props: ComponentProp[]
  tags: string[]
  usageCount: number
  lastModified: string
}

export interface CanvasFile {
  id: string
  name: string
  pages: CanvasPage[]
  tokenSet: TokenSet
  components: ComponentDefinition[]
  framework: 'react-tailwind' | 'react-css' | 'vue-tailwind' | 'html-css'
  githubRepo?: string
  githubBranch?: string
  createdAt: string
  updatedAt: string
}

// ── Collaboration ─────────────────────────────────────────────────────────

export interface CollaboratorCursor {
  x: number
  y: number
}

export interface Collaborator {
  id: string
  name: string
  color: string
  avatar?: string
  cursor?: CollaboratorCursor
  pageId?: string
  online: boolean
}

export interface CommentReply {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

export interface Comment {
  id: string
  fileId: string
  pageId: string
  authorId: string
  authorName: string
  x: number
  y: number
  text: string
  category: 'visual' | 'code' | 'ux' | 'accessibility'
  severity: 'blocker' | 'required' | 'suggestion'
  resolved: boolean
  createdAt: string
  replies: CommentReply[]
  nodeId?: string
}

// ── Versions ──────────────────────────────────────────────────────────────

export interface VersionCheckpoint {
  id: string
  fileId: string
  name?: string
  snapshot: CanvasFile
  createdBy: string
  createdAt: string
  isAuto: boolean
}

export interface Branch {
  id: string
  name: string
  fileId: string
  basedOn: string
  createdBy: string
  createdAt: string
}

// ── Push / Code ───────────────────────────────────────────────────────────

export interface PushRecord {
  id: string
  fileId: string
  scope: 'component' | 'page' | 'full'
  branch: string
  prUrl?: string
  previewUrl?: string
  changedFiles: string[]
  createdAt: string
  status: 'pending' | 'success' | 'failed'
}

export interface GeneratedCode {
  jsx: string
  css?: string
  props?: string
}

// ── AI ────────────────────────────────────────────────────────────────────

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  creditsUsed?: number
  action?: unknown
}

export interface GenerationJob {
  id: string
  prompt: string
  status: 'queued' | 'running' | 'done' | 'failed'
  progressMsg?: string
  result?: unknown
  createdAt: string
}

export interface CritiqueAnnotation {
  nodeId: string
  x: number
  y: number
  severity: 'critical' | 'warning' | 'info'
  category: string
  message: string
  suggestion?: string
  autoFixable: boolean
}

// ── Linter ────────────────────────────────────────────────────────────────

export interface ConstraintViolation {
  id: string
  nodeId: string
  severity: 'critical' | 'warning' | 'info'
  rule: string
  message: string
  fix?: string
  autoFixable: boolean
}

export interface LinterRule {
  id: string
  name: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  enabled: boolean
  autoFix: boolean
}

export const DEFAULT_LINTER_RULES: LinterRule[] = [
  { id: 'touch-target',    name: 'Touch target',      description: 'Interactive elements must be at least 44×44px',  severity: 'critical', enabled: true,  autoFix: true  },
  { id: 'contrast-aa',     name: 'WCAG AA contrast',  description: 'Text must have 4.5:1 contrast ratio',             severity: 'critical', enabled: true,  autoFix: false },
  { id: 'off-grid',        name: 'Off-grid spacing',  description: 'Spacing values must be on the 4px grid',          severity: 'warning',  enabled: true,  autoFix: true  },
  { id: 'off-token-color', name: 'Off-token color',   description: 'Fill colors should reference the token set',     severity: 'warning',  enabled: true,  autoFix: false },
  { id: 'off-token-type',  name: 'Off-token type',    description: 'Font sizes should be on the type scale',         severity: 'warning',  enabled: true,  autoFix: false },
  { id: 'near-dupe-color', name: 'Near-duplicate',    description: 'Two fills within ΔE < 8',                        severity: 'info',     enabled: true,  autoFix: false },
  { id: 'component-drift', name: 'Component drift',   description: 'Instance properties detached from master',        severity: 'warning',  enabled: true,  autoFix: true  },
  { id: 'missing-alt',     name: 'Missing alt text',  description: 'Images must have a description',                 severity: 'critical', enabled: true,  autoFix: false },
]

// ── Data ──────────────────────────────────────────────────────────────────

export interface DataSourceField {
  name: string
  type: string
}

export interface DataSource {
  id: string
  name: string
  type: 'rest' | 'graphql' | 'csv' | 'json' | 'faker'
  config: Record<string, unknown>
  schema?: DataSourceField[]
  preview?: unknown[]
}

// ── Review ────────────────────────────────────────────────────────────────

export interface ReviewSession {
  id: string
  fileId: string
  name: string
  status: 'open' | 'approved' | 'rejected'
  comments: string[]
  createdAt: string
}

// ── Analytics ─────────────────────────────────────────────────────────────

export interface PageAnalytics {
  views?: number
  sessionCount?: number
  heatmapData?: unknown
}

export interface AnalyticsConnection {
  provider: 'posthog' | 'mixpanel' | 'amplitude' | 'ga4'
  connected: boolean
  projectId?: string
  apiKey?: string
}

// ── User ──────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  credits: number
  tier: 'free' | 'canvas' | 'canvas-pro'
}

// ── Responsive ────────────────────────────────────────────────────────────

export interface Breakpoint {
  name: string
  width: number
}

export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { name: 'Mobile S', width: 320 },
  { name: 'Mobile',   width: 390 },
  { name: 'Tablet',   width: 768 },
  { name: 'Laptop',   width: 1024 },
  { name: 'Desktop',  width: 1440 },
  { name: 'Wide',     width: 1920 },
]

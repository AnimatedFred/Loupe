import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type {
  CanvasNode, CanvasPage, CanvasFile, ComponentDefinition,
  TokenSet, DesignToken, ConstraintViolation, GenerationJob,
  AIMessage, Comment, VersionCheckpoint, Branch, PushRecord,
  DataSource, ReviewSession, Collaborator, Breakpoint,
  User, LinterRule, CritiqueAnnotation, PageAnalytics, AnalyticsConnection,
  Fill, Color,
} from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────

function defaultColor(hex: string): Color {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return { r, g, b, a: 1 }
}

function defaultFill(hex: string): Fill {
  return { type: 'SOLID', color: defaultColor(hex) }
}

function defaultPage(): CanvasPage {
  return {
    id: nanoid(),
    name: 'Page 1',
    route: '/',
    nodes: [],
    background: defaultColor('#050508'),
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

// Silence unused-variable warnings for helpers that are available for future use
void defaultFill

// ── Code → Canvas bridge types ────────────────────────────────────────────

export interface CodeComponent {
  name: string
  file: string
  x?: number
  y?: number
  width: number
  height: number
  fillColor?: string
  cornerRadius?: number
  type: 'frame' | 'text' | 'rect'
  text?: string
  textColor?: string
  fontSize?: number
  children?: CodeComponent[]
}

function codeComponentToNode(comp: CodeComponent, offsetX = 0, offsetY = 0): CanvasNode {
  const x = (comp.x ?? 0) + offsetX
  const y = (comp.y ?? 0) + offsetY
  const fill = comp.fillColor ? defaultColor(comp.fillColor) : defaultColor('#111118')

  if (comp.type === 'text') {
    const tc = comp.textColor ? defaultColor(comp.textColor) : defaultColor('#F2F2F4')
    return {
      id: nanoid(),
      name: comp.name,
      type: 'TEXT',
      x, y,
      width: comp.width,
      height: comp.height,
      opacity: 1, visible: true, locked: false,
      fills: [], strokes: [], shadows: [],
      characters: comp.text ?? comp.name,
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: comp.fontSize ?? 14,
        fontWeight: 400,
        lineHeight: comp.fontSize ? comp.fontSize * 1.4 : 20,
        letterSpacing: 0,
        textAlign: 'left',
        color: { ...tc, a: 1 },
      },
      codeRef: { componentName: comp.name, file: comp.file },
    }
  }

  return {
    id: nanoid(),
    name: comp.name,
    type: comp.type === 'rect' ? 'RECTANGLE' : 'FRAME',
    x, y,
    width: comp.width,
    height: comp.height,
    opacity: 1, visible: true, locked: false,
    fills: [{ type: 'SOLID', color: { ...fill, a: 1 } }],
    strokes: [{ color: { r: 1, g: 1, b: 1, a: 0.06 }, weight: 1, position: 'INSIDE' }],
    shadows: [],
    cornerRadius: comp.cornerRadius ?? 8,
    clipContent: true,
    children: comp.children?.map(c => codeComponentToNode(c, 0, 0)) ?? [],
    codeRef: { componentName: comp.name, file: comp.file },
  }
}

// ── State shape ───────────────────────────────────────────────────────────

export interface CanvasState {
  file: CanvasFile | null
  activePageId: string | null
  activePage: CanvasPage | null
  selectedNodeIds: string[]
  hoveredNodeId: string | null
  viewport: { x: number; y: number; zoom: number }
  viewportWidth: number
  activeTool: 'select' | 'frame' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'image' | 'pen' | 'hand' | 'ai' | 'comment' | 'sketch'
  activeRightPanel: 'design' | 'subsurface' | 'code' | 'ai' | 'push' | 'data' | 'linter' | 'review' | 'analytics'
  activeLeftPanel: 'layers' | 'assets' | 'pages' | 'components' | 'tokens'
  showResponsiveSlider: boolean
  showLinterPanel: boolean
  showAnalyticsOverlay: boolean
  showDataPanel: boolean
  showReviewMode: boolean
  sketchMode: boolean
  studioMode: boolean
  collaborators: Collaborator[]
  comments: Comment[]
  showComments: boolean
  followingUserId: string | null
  aiMessages: AIMessage[]
  generationJobs: GenerationJob[]
  critiqueAnnotations: CritiqueAnnotation[]
  showCritique: boolean
  aiLoading: boolean
  violations: ConstraintViolation[]
  linterRules: LinterRule[]
  linterRunning: boolean
  versions: VersionCheckpoint[]
  branches: Branch[]
  activeBranch: string
  pushRecords: PushRecord[]
  pendingChanges: string[]
  generatedCode: Record<string, string>
  dataSources: DataSource[]
  dataState: 'normal' | 'loading' | 'populated' | 'empty' | 'error'
  reviewSessions: ReviewSession[]
  activeReviewId: string | null
  analyticsConnections: AnalyticsConnection[]
  pageAnalytics: Record<string, PageAnalytics>
  breakpointWidth: number
  customBreakpoints: Breakpoint[]
  undoStack: CanvasPage[]
  redoStack: CanvasPage[]
  user: User | null
  credits: number
  saveStatus: 'loading' | 'unsaved' | 'saving' | 'saved'
  activeProjectId: string | null
}

// ── Actions shape ─────────────────────────────────────────────────────────

export interface CanvasActions {
  initFile: (file: CanvasFile) => void
  setActivePage: (pageId: string) => void
  addPage: (name?: string) => void
  renamePage: (pageId: string, name: string) => void
  deletePage: (pageId: string) => void
  updateFile: (updates: Partial<CanvasFile>) => void
  addNode: (node: CanvasNode, parentId?: string) => void
  updateNode: (nodeId: string, updates: Partial<CanvasNode>) => void
  deleteNodes: (nodeIds: string[]) => void
  duplicateNodes: (nodeIds: string[]) => void
  moveNode: (nodeId: string, x: number, y: number) => void
  resizeNode: (nodeId: string, width: number, height: number) => void
  reorderNode: (nodeId: string, direction: 'up' | 'down' | 'front' | 'back') => void
  groupNodes: (nodeIds: string[]) => void
  ungroupNode: (nodeId: string) => void
  lockNode: (nodeId: string, locked: boolean) => void
  setNodeVisibility: (nodeId: string, visible: boolean) => void
  setSelectedNodes: (nodeIds: string[]) => void
  addToSelection: (nodeId: string) => void
  clearSelection: () => void
  setHoveredNode: (nodeId: string | null) => void
  setActiveTool: (tool: CanvasState['activeTool']) => void
  setActiveRightPanel: (panel: CanvasState['activeRightPanel']) => void
  setActiveLeftPanel: (panel: CanvasState['activeLeftPanel']) => void
  toggleResponsiveSlider: () => void
  toggleLinterPanel: () => void
  toggleAnalyticsOverlay: () => void
  toggleDataPanel: () => void
  toggleReviewMode: () => void
  setSketchMode: (on: boolean) => void
  setStudioMode: (on: boolean) => void
  createNodesFromCode: (components: CodeComponent[]) => void
  setViewport: (vp: Partial<{ x: number; y: number; zoom: number }>) => void
  setBreakpointWidth: (w: number) => void
  setTokenSet: (ts: TokenSet) => void
  addToken: (token: DesignToken) => void
  updateToken: (name: string, updates: Partial<DesignToken>) => void
  removeToken: (name: string) => void
  importTokensFromScan: (url: string) => Promise<void>
  createComponent: (nodeId: string, name: string) => void
  addComponentVariant: (componentId: string, variantProps: Record<string, string>) => void
  updateCollaborator: (c: Collaborator) => void
  removeCollaborator: (id: string) => void
  addComment: (comment: Comment) => void
  resolveComment: (commentId: string) => void
  setFollowing: (userId: string | null) => void
  addAIMessage: (msg: AIMessage) => void
  addGenerationJob: (job: GenerationJob) => void
  updateGenerationJob: (id: string, updates: Partial<GenerationJob>) => void
  setCritiqueAnnotations: (annotations: CritiqueAnnotation[]) => void
  toggleCritique: () => void
  setAILoading: (v: boolean) => void
  setViolations: (violations: ConstraintViolation[]) => void
  dismissViolation: (id: string) => void
  toggleLinterRule: (ruleId: string) => void
  setGeneratedCode: (nodeId: string, code: string) => void
  addPushRecord: (record: PushRecord) => void
  markNodeChanged: (nodeId: string) => void
  clearPendingChanges: () => void
  addDataSource: (ds: DataSource) => void
  updateDataSource: (id: string, updates: Partial<DataSource>) => void
  removeDataSource: (id: string) => void
  setDataState: (state: CanvasState['dataState']) => void
  bindNodeToData: (nodeId: string, field: string, sourceId: string) => void
  addReviewSession: (rs: ReviewSession) => void
  setActiveReview: (id: string | null) => void
  setAnalyticsConnection: (conn: AnalyticsConnection) => void
  setPageAnalytics: (pageId: string, data: PageAnalytics) => void
  saveVersion: (name?: string) => void
  restoreVersion: (checkpointId: string) => void
  createBranch: (name: string) => void
  switchBranch: (branchId: string) => void
  undo: () => void
  redo: () => void
  pushUndoSnapshot: () => void
  setUser: (user: User) => void
  setCredits: (n: number) => void
  deductCredits: (n: number) => void
  setSaveStatus: (status: CanvasState['saveStatus']) => void
  setActiveProjectId: (id: string) => void
}

// ── Tree helpers ──────────────────────────────────────────────────────────

function findNode(nodes: CanvasNode[], id: string): CanvasNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

function updateNodeInTree(nodes: CanvasNode[], id: string, updates: Partial<CanvasNode>): CanvasNode[] {
  return nodes.map(n => {
    if (n.id === id) return { ...n, ...updates }
    if (n.children) return { ...n, children: updateNodeInTree(n.children, id, updates) }
    return n
  })
}

function deleteNodeFromTree(nodes: CanvasNode[], ids: Set<string>): CanvasNode[] {
  return nodes
    .filter(n => !ids.has(n.id))
    .map(n => n.children ? { ...n, children: deleteNodeFromTree(n.children, ids) } : n)
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  immer((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────

    file: null,
    activePageId: null,
    activePage: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    viewportWidth: 1440,
    activeTool: 'select',
    activeRightPanel: 'design',
    activeLeftPanel: 'layers',
    showResponsiveSlider: false,
    showLinterPanel: false,
    showAnalyticsOverlay: false,
    showDataPanel: false,
    showReviewMode: false,
    sketchMode: false,
    studioMode: false,
    collaborators: [],
    comments: [],
    showComments: true,
    followingUserId: null,
    aiMessages: [],
    generationJobs: [],
    critiqueAnnotations: [],
    showCritique: false,
    aiLoading: false,
    violations: [],
    linterRules: [
      { id: 'touch-target',    name: 'Touch target',      description: 'Interactive elements must be at least 44×44px',  severity: 'critical', enabled: true,  autoFix: true  },
      { id: 'contrast-aa',     name: 'WCAG AA contrast',  description: 'Text must have 4.5:1 contrast ratio',             severity: 'critical', enabled: true,  autoFix: false },
      { id: 'off-grid',        name: 'Off-grid spacing',  description: 'Spacing values must be on the 4px grid',          severity: 'warning',  enabled: true,  autoFix: true  },
      { id: 'off-token-color', name: 'Off-token color',   description: 'Fill colors should reference the token set',     severity: 'warning',  enabled: true,  autoFix: false },
      { id: 'off-token-type',  name: 'Off-token type',    description: 'Font sizes should be on the type scale',         severity: 'warning',  enabled: true,  autoFix: false },
      { id: 'near-dupe-color', name: 'Near-duplicate',    description: 'Two fills within ΔE < 8',                        severity: 'info',     enabled: true,  autoFix: false },
      { id: 'component-drift', name: 'Component drift',   description: 'Instance properties detached from master',        severity: 'warning',  enabled: true,  autoFix: true  },
      { id: 'missing-alt',     name: 'Missing alt text',  description: 'Images must have a description',                 severity: 'critical', enabled: true,  autoFix: false },
    ],
    linterRunning: false,
    versions: [],
    branches: [],
    activeBranch: 'main',
    pushRecords: [],
    pendingChanges: [],
    generatedCode: {},
    dataSources: [],
    dataState: 'normal',
    reviewSessions: [],
    activeReviewId: null,
    analyticsConnections: [],
    pageAnalytics: {},
    breakpointWidth: 1440,
    customBreakpoints: [],
    undoStack: [],
    redoStack: [],
    user: null,
    credits: 0,
    saveStatus: 'saved',
    activeProjectId: null,

    // ── File actions ────────────────────────────────────────────────────────

    initFile: (file) => set(s => {
      s.file = file
      const firstPage = file.pages[0]
      s.activePageId = firstPage?.id ?? null
      s.activePage = firstPage ?? null
    }),

    setActivePage: (pageId) => set(s => {
      s.activePageId = pageId
      s.activePage = s.file?.pages.find(p => p.id === pageId) ?? null
      s.selectedNodeIds = []
    }),

    addPage: (name) => set(s => {
      if (!s.file) return
      const page: CanvasPage = {
        id: nanoid(), name: name ?? `Page ${s.file.pages.length + 1}`,
        route: `/${(name ?? 'page').toLowerCase().replace(/\s+/g, '-')}`,
        nodes: [], background: { r: 0.02, g: 0.02, b: 0.031, a: 1 },
        viewport: { x: 0, y: 0, zoom: 1 },
      }
      s.file.pages.push(page)
      s.activePageId = page.id
      s.activePage = page
    }),

    renamePage: (pageId, name) => set(s => {
      const page = s.file?.pages.find(p => p.id === pageId)
      if (page) page.name = name
      if (s.activePage?.id === pageId) s.activePage.name = name
    }),

    deletePage: (pageId) => set(s => {
      if (!s.file || s.file.pages.length <= 1) return
      s.file.pages = s.file.pages.filter(p => p.id !== pageId)
      if (s.activePageId === pageId) {
        s.activePageId = s.file.pages[0].id
        s.activePage = s.file.pages[0]
      }
    }),

    updateFile: (updates) => set(s => {
      if (s.file) Object.assign(s.file, updates)
    }),

    // ── Node actions ────────────────────────────────────────────────────────

    addNode: (node, parentId) => set(s => {
      if (!s.activePage) return
      get().pushUndoSnapshot()
      if (parentId) {
        const parent = findNode(s.activePage.nodes, parentId)
        if (parent) {
          parent.children = [...(parent.children ?? []), node]
        }
      } else {
        s.activePage.nodes.push(node)
      }
      s.pendingChanges.push(node.id)
      const fp = s.file?.pages.find(p => p.id === s.activePageId)
      if (fp) fp.nodes = s.activePage.nodes
    }),

    updateNode: (nodeId, updates) => set(s => {
      if (!s.activePage) return
      s.activePage.nodes = updateNodeInTree(s.activePage.nodes, nodeId, updates) as CanvasNode[]
      if (!s.pendingChanges.includes(nodeId)) s.pendingChanges.push(nodeId)
      const fp = s.file?.pages.find(p => p.id === s.activePageId)
      if (fp) fp.nodes = s.activePage.nodes
    }),

    deleteNodes: (nodeIds) => set(s => {
      if (!s.activePage) return
      get().pushUndoSnapshot()
      const idSet = new Set(nodeIds)
      s.activePage.nodes = deleteNodeFromTree(s.activePage.nodes, idSet) as CanvasNode[]
      s.selectedNodeIds = s.selectedNodeIds.filter(id => !idSet.has(id))
      const fp = s.file?.pages.find(p => p.id === s.activePageId)
      if (fp) fp.nodes = s.activePage.nodes
    }),

    duplicateNodes: (nodeIds) => set(s => {
      if (!s.activePage) return
      nodeIds.forEach(id => {
        const node = findNode(s.activePage!.nodes, id)
        if (node) {
          const dup: CanvasNode = { ...JSON.parse(JSON.stringify(node)), id: nanoid(), x: node.x + 20, y: node.y + 20, name: `${node.name} copy` }
          s.activePage!.nodes.push(dup)
        }
      })
    }),

    moveNode: (nodeId, x, y) => set(s => {
      if (!s.activePage) return
      s.activePage.nodes = updateNodeInTree(s.activePage.nodes, nodeId, { x, y }) as CanvasNode[]
      if (!s.pendingChanges.includes(nodeId)) s.pendingChanges.push(nodeId)
    }),

    resizeNode: (nodeId, width, height) => set(s => {
      if (!s.activePage) return
      s.activePage.nodes = updateNodeInTree(s.activePage.nodes, nodeId, { width, height }) as CanvasNode[]
    }),

    reorderNode: (nodeId, direction) => set(s => {
      if (!s.activePage) return
      const nodes = s.activePage.nodes
      const idx = nodes.findIndex(n => n.id === nodeId)
      if (idx === -1) return
      if (direction === 'up' && idx > 0) {
        ;[nodes[idx], nodes[idx - 1]] = [nodes[idx - 1], nodes[idx]]
      } else if (direction === 'down' && idx < nodes.length - 1) {
        ;[nodes[idx], nodes[idx + 1]] = [nodes[idx + 1], nodes[idx]]
      } else if (direction === 'front') {
        const [n] = nodes.splice(idx, 1); nodes.push(n)
      } else if (direction === 'back') {
        const [n] = nodes.splice(idx, 1); nodes.unshift(n)
      }
    }),

    groupNodes: (nodeIds) => set(s => {
      if (!s.activePage || nodeIds.length < 2) return
      const toGroup = nodeIds.map(id => findNode(s.activePage!.nodes, id)).filter(Boolean) as CanvasNode[]
      const minX = Math.min(...toGroup.map(n => n.x))
      const minY = Math.min(...toGroup.map(n => n.y))
      const maxX = Math.max(...toGroup.map(n => n.x + n.width))
      const maxY = Math.max(...toGroup.map(n => n.y + n.height))
      const group: CanvasNode = {
        id: nanoid(), name: 'Group', type: 'GROUP',
        x: minX, y: minY, width: maxX - minX, height: maxY - minY,
        rotation: 0, opacity: 1, visible: true, locked: false,
        fills: [], strokes: [], shadows: [],
        children: toGroup.map(n => ({ ...n, x: n.x - minX, y: n.y - minY })),
      }
      const idSet = new Set(nodeIds)
      s.activePage.nodes = deleteNodeFromTree(s.activePage.nodes, idSet) as CanvasNode[]
      s.activePage.nodes.push(group)
      s.selectedNodeIds = [group.id]
    }),

    ungroupNode: (nodeId) => set(s => {
      if (!s.activePage) return
      const node = findNode(s.activePage.nodes, nodeId)
      if (!node?.children) return
      const children = node.children.map(c => ({ ...c, x: c.x + node.x, y: c.y + node.y }))
      s.activePage.nodes = deleteNodeFromTree(s.activePage.nodes, new Set([nodeId])) as CanvasNode[]
      s.activePage.nodes.push(...children)
      s.selectedNodeIds = children.map(c => c.id)
    }),

    lockNode: (nodeId, locked) => set(s => {
      if (!s.activePage) return
      s.activePage.nodes = updateNodeInTree(s.activePage.nodes, nodeId, { locked }) as CanvasNode[]
    }),

    setNodeVisibility: (nodeId, visible) => set(s => {
      if (!s.activePage) return
      s.activePage.nodes = updateNodeInTree(s.activePage.nodes, nodeId, { visible }) as CanvasNode[]
    }),

    // ── Selection ───────────────────────────────────────────────────────────

    setSelectedNodes: (nodeIds) => set(s => { s.selectedNodeIds = nodeIds }),
    addToSelection: (nodeId) => set(s => {
      if (!s.selectedNodeIds.includes(nodeId)) s.selectedNodeIds.push(nodeId)
    }),
    clearSelection: () => set(s => { s.selectedNodeIds = [] }),
    setHoveredNode: (id) => set(s => { s.hoveredNodeId = id }),

    // ── Tool / panel ────────────────────────────────────────────────────────

    setActiveTool: (tool) => set(s => { s.activeTool = tool }),
    setActiveRightPanel: (panel) => set(s => { s.activeRightPanel = panel }),
    setActiveLeftPanel: (panel) => set(s => { s.activeLeftPanel = panel }),
    toggleResponsiveSlider: () => set(s => { s.showResponsiveSlider = !s.showResponsiveSlider }),
    toggleLinterPanel:      () => set(s => { s.showLinterPanel = !s.showLinterPanel }),
    toggleAnalyticsOverlay: () => set(s => { s.showAnalyticsOverlay = !s.showAnalyticsOverlay }),
    toggleDataPanel:        () => set(s => { s.showDataPanel = !s.showDataPanel }),
    toggleReviewMode:       () => set(s => { s.showReviewMode = !s.showReviewMode }),
    setSketchMode:     (on) => set(s => { s.sketchMode = on }),
    setStudioMode:     (on) => set(s => { s.studioMode = on }),

    createNodesFromCode: (components) => set(s => {
      if (!s.activePage) return
      // Remove existing codeRef nodes so re-generation replaces them cleanly
      const names = new Set(components.map(c => c.name))
      s.activePage.nodes = s.activePage.nodes.filter(
        n => !n.codeRef || !names.has(n.codeRef.componentName)
      )
      // Default position: to the right of existing canvas content
      const existingMaxX = s.activePage.nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0)
      const startX = Math.max(existingMaxX + 80, 600)
      const newNodes = components.map((c, i) =>
        codeComponentToNode(c, c.x !== undefined ? 0 : startX, c.y !== undefined ? 0 : 80 + i * 0)
      )
      s.activePage.nodes.push(...newNodes)
    }),

    // ── Viewport ────────────────────────────────────────────────────────────

    setViewport: (vp) => set(s => {
      if (!s.activePage) return
      Object.assign(s.activePage.viewport, vp)
      Object.assign(s.viewport, vp)
    }),
    setBreakpointWidth: (w) => set(s => { s.breakpointWidth = w }),

    // ── Tokens ──────────────────────────────────────────────────────────────

    setTokenSet: (ts) => set(s => { if (s.file) s.file.tokenSet = ts }),

    addToken: (token) => set(s => {
      if (!s.file) return
      const exists = s.file.tokenSet.tokens.findIndex(t => t.name === token.name)
      if (exists >= 0) s.file.tokenSet.tokens[exists] = token
      else s.file.tokenSet.tokens.push(token)
    }),

    updateToken: (name, updates) => set(s => {
      if (!s.file) return
      const t = s.file.tokenSet.tokens.find(t => t.name === name)
      if (t) Object.assign(t, updates)
    }),

    removeToken: (name) => set(s => {
      if (!s.file) return
      s.file.tokenSet.tokens = s.file.tokenSet.tokens.filter(t => t.name !== name)
    }),

    importTokensFromScan: async (url) => {
      try {
        const res = await fetch('/api/scan/extract', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const data = await res.json()
        if (data.tokens) {
          set(s => {
            if (!s.file) return
            s.file.tokenSet = { ...s.file.tokenSet, tokens: data.tokens, sourceUrl: url, extractedAt: new Date().toISOString() }
          })
        }
      } catch (e) { console.error('Token import failed', e) }
    },

    // ── Components ──────────────────────────────────────────────────────────

    createComponent: (nodeId, name) => set(s => {
      if (!s.activePage || !s.file) return
      const node = findNode(s.activePage.nodes, nodeId)
      if (!node) return
      const comp: ComponentDefinition = {
        id: nanoid(), name, description: '', rootNode: { ...node },
        variants: [], props: [], tags: [], usageCount: 1, lastModified: new Date().toISOString(),
      }
      s.file.components.push(comp)
      s.activePage.nodes = updateNodeInTree(s.activePage.nodes, nodeId, { type: 'COMPONENT', componentId: comp.id }) as CanvasNode[]
    }),

    addComponentVariant: (componentId, variantProps) => set(s => {
      if (!s.file) return
      const comp = s.file.components.find(c => c.id === componentId)
      if (!comp) return
      comp.variants.push({ id: nanoid(), name: Object.values(variantProps).join('/'), properties: variantProps, overrides: {} })
    }),

    // ── Collaboration ────────────────────────────────────────────────────────

    updateCollaborator: (c) => set(s => {
      const idx = s.collaborators.findIndex(x => x.id === c.id)
      if (idx >= 0) s.collaborators[idx] = c
      else s.collaborators.push(c)
    }),
    removeCollaborator: (id) => set(s => { s.collaborators = s.collaborators.filter(c => c.id !== id) }),
    addComment: (comment) => set(s => { s.comments.push(comment) }),
    resolveComment: (commentId) => set(s => {
      const c = s.comments.find(c => c.id === commentId)
      if (c) c.resolved = true
    }),
    setFollowing: (userId) => set(s => { s.followingUserId = userId }),

    // ── AI ──────────────────────────────────────────────────────────────────

    addAIMessage: (msg) => set(s => { s.aiMessages.push(msg) }),
    addGenerationJob: (job) => set(s => { s.generationJobs.push(job) }),
    updateGenerationJob: (id, updates) => set(s => {
      const j = s.generationJobs.find(j => j.id === id)
      if (j) Object.assign(j, updates)
    }),
    setCritiqueAnnotations: (annotations) => set(s => { s.critiqueAnnotations = annotations }),
    toggleCritique: () => set(s => { s.showCritique = !s.showCritique }),
    setAILoading: (v) => set(s => { s.aiLoading = v }),

    // ── Linter ──────────────────────────────────────────────────────────────

    setViolations: (violations) => set(s => { s.violations = violations }),
    dismissViolation: (id) => set(s => { s.violations = s.violations.filter(v => v.id !== id) }),
    toggleLinterRule: (ruleId) => set(s => {
      const r = s.linterRules.find(r => r.id === ruleId)
      if (r) r.enabled = !r.enabled
    }),

    // ── Code ────────────────────────────────────────────────────────────────

    setGeneratedCode: (nodeId, code) => set(s => { s.generatedCode[nodeId] = code }),
    addPushRecord: (record) => set(s => { s.pushRecords.unshift(record) }),
    markNodeChanged: (nodeId) => set(s => { if (!s.pendingChanges.includes(nodeId)) s.pendingChanges.push(nodeId) }),
    clearPendingChanges: () => set(s => { s.pendingChanges = [] }),

    // ── Data ────────────────────────────────────────────────────────────────

    addDataSource: (ds) => set(s => { s.dataSources.push(ds) }),
    updateDataSource: (id, updates) => set(s => {
      const ds = s.dataSources.find(d => d.id === id)
      if (ds) Object.assign(ds, updates)
    }),
    removeDataSource: (id) => set(s => { s.dataSources = s.dataSources.filter(d => d.id !== id) }),
    setDataState: (state) => set(s => { s.dataState = state }),
    bindNodeToData: (nodeId, field, sourceId) => set(s => {
      if (!s.activePage) return
      const node = findNode(s.activePage.nodes, nodeId)
      if (!node) return
      node.dataBindings = { ...node.dataBindings, [field]: { sourceId, field } }
    }),

    // ── Review ──────────────────────────────────────────────────────────────

    addReviewSession: (rs) => set(s => { s.reviewSessions.push(rs) }),
    setActiveReview: (id) => set(s => { s.activeReviewId = id }),

    // ── Analytics ───────────────────────────────────────────────────────────

    setAnalyticsConnection: (conn) => set(s => {
      const idx = s.analyticsConnections.findIndex(c => c.provider === conn.provider)
      if (idx >= 0) s.analyticsConnections[idx] = conn
      else s.analyticsConnections.push(conn)
    }),
    setPageAnalytics: (pageId, data) => set(s => { s.pageAnalytics[pageId] = data }),

    // ── Versions ────────────────────────────────────────────────────────────

    saveVersion: (name) => set(s => {
      if (!s.file) return
      const cp: VersionCheckpoint = {
        id: nanoid(), fileId: s.file.id, name,
        snapshot: JSON.parse(JSON.stringify(s.file)),
        createdBy: s.user?.id ?? 'unknown',
        createdAt: new Date().toISOString(), isAuto: !name,
      }
      s.versions.unshift(cp)
      if (s.versions.length > 50) s.versions.pop()
    }),

    restoreVersion: (checkpointId) => set(s => {
      const cp = s.versions.find(v => v.id === checkpointId)
      if (!cp) return
      s.file = JSON.parse(JSON.stringify(cp.snapshot))
      s.activePage = s.file?.pages.find(p => p.id === s.activePageId) ?? s.file?.pages[0] ?? null
    }),

    createBranch: (name) => set(s => {
      const branch: Branch = {
        id: nanoid(), name, fileId: s.file?.id ?? '',
        basedOn: s.activeBranch, createdBy: s.user?.id ?? '',
        createdAt: new Date().toISOString(),
      }
      s.branches.push(branch)
      s.activeBranch = branch.id
    }),

    switchBranch: (branchId) => set(s => { s.activeBranch = branchId }),

    // ── Undo / redo ──────────────────────────────────────────────────────────

    pushUndoSnapshot: () => set(s => {
      if (!s.activePage) return
      s.undoStack.push(JSON.parse(JSON.stringify(s.activePage)))
      if (s.undoStack.length > 50) s.undoStack.shift()
      s.redoStack = []
    }),

    undo: () => set(s => {
      const snapshot = s.undoStack.pop()
      if (!snapshot || !s.activePage) return
      s.redoStack.push(JSON.parse(JSON.stringify(s.activePage)))
      Object.assign(s.activePage, snapshot)
      const fp = s.file?.pages.find(p => p.id === s.activePageId)
      if (fp) Object.assign(fp, snapshot)
    }),

    redo: () => set(s => {
      const snapshot = s.redoStack.pop()
      if (!snapshot || !s.activePage) return
      s.undoStack.push(JSON.parse(JSON.stringify(s.activePage)))
      Object.assign(s.activePage, snapshot)
      const fp = s.file?.pages.find(p => p.id === s.activePageId)
      if (fp) Object.assign(fp, snapshot)
    }),

    // ── User ────────────────────────────────────────────────────────────────

    setUser: (user) => set(s => { s.user = user; s.credits = user.credits }),
    setCredits: (n) => set(s => { s.credits = n }),
    deductCredits: (n) => set(s => { s.credits = Math.max(0, s.credits - n) }),
    setSaveStatus: (status) => set(s => { s.saveStatus = status }),
    setActiveProjectId: (id) => set(s => { s.activeProjectId = id }),
  }))
)

// ── Convenience selectors ──────────────────────────────────────────────────

export const useActivePage     = () => useCanvasStore(s => s.activePage)
export const useSelectedNodes  = () => useCanvasStore(s => s.selectedNodeIds)
export const useActiveFile     = () => useCanvasStore(s => s.file)
export const useTokens         = () => useCanvasStore(s => s.file?.tokenSet.tokens ?? [])
export const useViolations     = () => useCanvasStore(s => s.violations)
export const useAIMessages     = () => useCanvasStore(s => s.aiMessages)
export const useGenerationJobs = () => useCanvasStore(s => s.generationJobs)
export const useCredits        = () => useCanvasStore(s => s.credits)
export const usePendingChanges = () => useCanvasStore(s => s.pendingChanges)

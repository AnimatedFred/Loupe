'use client'

import { useEffect, useMemo, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useCanvasStore } from '@/stores/canvas.store'
import { useAppStore } from '@/stores/app.store'
import { makeFrame, makeText, makeRect, makeButton } from '@/lib/utils'
import { Toolbar } from '@/components/Toolbar'
import { LeftPanel } from '@/components/LeftPanel'
import { CanvasRendererGL } from '@/components/CanvasRendererGL'
import { RightPanel } from '@/components/RightPanel'
import { StudioPanels } from '@/components/Studio'
import { serializeCanvasContext } from '@/lib/serializeCanvas'
import { buildHtmlWithTokens } from '@/lib/studioHtml'
import { supabase } from '@/lib/supabase'
import type { CanvasFile, CanvasPage, TokenSet } from '@/types'
import { nanoid } from 'nanoid'

function makeDefaultFile(): CanvasFile {
  const pageId = nanoid()

  const frame   = makeFrame({ x: 120, y: 80,  width: 360, height: 640, name: 'Mobile — Home' })
  const heading = makeText('Welcome to Subsrf',  { x: 144, y: 140 })
  const sub     = makeText('Design × Code × AI', { x: 144, y: 174 })
  const btn     = { ...makeButton('Get started'),  x: 144, y: 220 }
  const card    = makeFrame({ x: 144, y: 296, width: 280, height: 120, name: 'Card' })
  const cardTxt = makeText('Select any element to inspect its subsurface layer, generate code, or ask AI to edit it.', { x: 160, y: 312 })

  const tokenSet: TokenSet = {
    id: nanoid(),
    name: 'Default',
    tokens: [
      { name: 'color.void',    category: 'color',      value: '#050508' },
      { name: 'color.deep',    category: 'color',      value: '#09090F' },
      { name: 'color.layer',   category: 'color',      value: '#111118' },
      { name: 'color.surface', category: 'color',      value: '#18181F' },
      { name: 'color.t1',      category: 'color',      value: '#F2F2F4' },
      { name: 'color.neon',    category: 'color',      value: '#00FF87' },
      { name: 'color.ok',      category: 'color',      value: '#39D98A' },
      { name: 'color.warn',    category: 'color',      value: '#FFB020' },
      { name: 'color.err',     category: 'color',      value: '#FF4D4D' },
      { name: 'color.blue',    category: 'color',      value: '#4A9EFF' },
      { name: 'spacing.4',     category: 'spacing',    value: '4px' },
      { name: 'spacing.8',     category: 'spacing',    value: '8px' },
      { name: 'spacing.12',    category: 'spacing',    value: '12px' },
      { name: 'spacing.16',    category: 'spacing',    value: '16px' },
      { name: 'spacing.24',    category: 'spacing',    value: '24px' },
      { name: 'spacing.32',    category: 'spacing',    value: '32px' },
      { name: 'radius.sm',     category: 'radius',     value: '4px' },
      { name: 'radius.md',     category: 'radius',     value: '8px' },
      { name: 'radius.lg',     category: 'radius',     value: '12px' },
      { name: 'radius.full',   category: 'radius',     value: '9999px' },
      { name: 'type.xs',       category: 'typography', value: '10' },
      { name: 'type.sm',       category: 'typography', value: '12' },
      { name: 'type.base',     category: 'typography', value: '14' },
      { name: 'type.md',       category: 'typography', value: '16' },
      { name: 'type.lg',       category: 'typography', value: '20' },
      { name: 'type.xl',       category: 'typography', value: '24' },
      { name: 'type.2xl',      category: 'typography', value: '32' },
    ],
    extractedAt: new Date().toISOString(),
  }

  const page: CanvasPage = {
    id: pageId,
    name: 'Page 1',
    route: '/',
    nodes: [frame, heading, sub, btn, card, cardTxt],
    background: { r: 0.02, g: 0.02, b: 0.03, a: 1 },
    viewport: { x: 0, y: 0, zoom: 1 },
  }

  return {
    id: nanoid(),
    name: 'Untitled',
    pages: [page],
    tokenSet,
    components: [],
    framework: 'react-tailwind',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function CanvasWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()

  const {
    file, initFile, setCredits, setActivePage,
    studioMode, selectedNodeIds, activePage,
    setSaveStatus, setActiveProjectId,
  } = useCanvasStore()
  const { writeFile, files, resetFiles, loadFiles } = useAppStore()

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Load project from Supabase on mount
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      setSaveStatus('loading')
      setActiveProjectId(projectId)

      // Load project + user profile (credits) in parallel
      const [projectResult, profileResult] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('profiles').select('credits').eq('id', session.user.id).single(),
      ])

      if (projectResult.error || !projectResult.data) {
        router.push('/projects')
        return
      }

      const data = projectResult.data

      // Load canvas data
      const canvasFile = data.canvas_data
        ? (data.canvas_data as CanvasFile)
        : makeDefaultFile()

      // Override the file's id to match (in case it was default)
      canvasFile.id = projectId

      initFile(canvasFile)
      setActivePage(canvasFile.pages[0].id)
      setCredits(profileResult.data?.credits ?? 0)

      // Load studio files
      if (data.studio_files) {
        loadFiles(data.studio_files as Record<string, string>)
      } else {
        resetFiles()
      }

      setSaveStatus('saved')
    }

    load()
  }, [projectId])

  // Auto-save canvas on file changes (debounced 2s)
  useEffect(() => {
    if (!file || file.id !== projectId) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    setSaveStatus('unsaved')
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      await supabase
        .from('projects')
        .update({
          canvas_data: file as object,
          name: file.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
      setSaveStatus('saved')
    }, 2000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [file, projectId])

  // Auto-save studio files on changes (debounced 3s)
  const studioSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!file || file.id !== projectId) return
    if (studioSaveTimer.current) clearTimeout(studioSaveTimer.current)
    studioSaveTimer.current = setTimeout(async () => {
      await supabase
        .from('projects')
        .update({ studio_files: files })
        .eq('id', projectId)
    }, 3000)
    return () => {
      if (studioSaveTimer.current) clearTimeout(studioSaveTimer.current)
    }
  }, [files, projectId, file])

  // Sync design tokens → Sandpack HTML
  const tokenSet = file?.tokenSet
  useEffect(() => {
    if (!tokenSet) return
    writeFile('/index.html', buildHtmlWithTokens(tokenSet.tokens))
  }, [tokenSet])

  // Serialize canvas context for Studio AI
  const canvasContext = useMemo(() => {
    if (!studioMode || !activePage) return undefined
    const nodes = selectedNodeIds.length
      ? activePage.nodes.filter(n => selectedNodeIds.includes(n.id))
      : activePage.nodes
    return serializeCanvasContext(nodes, activePage.name)
  }, [studioMode, selectedNodeIds, activePage])

  if (!file) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-void items-center justify-center">
        <span className="font-mono text-[11px] text-white/20 animate-pulse">Loading project…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-void">
      <Toolbar />
      {studioMode ? (
        <StudioPanels canvasContext={canvasContext} />
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <LeftPanel />
          <CanvasRendererGL />
          <RightPanel />
        </div>
      )}
    </div>
  )
}

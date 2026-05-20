'use client'

import React from 'react'
import Link from 'next/link'
import { useCanvasStore } from '@/stores/canvas.store'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TOOLS = [
  { id: 'select',  icon: '⬚', label: 'Select',  shortcut: 'V' },
  { id: 'frame',   icon: '⬛', label: 'Frame',   shortcut: 'F' },
  { id: 'rect',    icon: '▭', label: 'Rect',    shortcut: 'R' },
  { id: 'ellipse', icon: '○', label: 'Ellipse', shortcut: 'E' },
  { id: 'text',    icon: 'T', label: 'Text',    shortcut: 'T' },
  { id: 'hand',    icon: '✋', label: 'Pan',     shortcut: 'H' },
] as const

export function Toolbar() {
  const router = useRouter()
  const {
    activeTool, setActiveTool, file, credits,
    showLinterPanel, showResponsiveSlider, showComments, sketchMode,
    studioMode, setStudioMode, selectedNodeIds, saveStatus,
  } = useCanvasStore()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function toggleLinter() {
    useCanvasStore.setState(s => ({ showLinterPanel: !s.showLinterPanel }))
  }
  function toggleResponsive() {
    useCanvasStore.setState(s => ({ showResponsiveSlider: !s.showResponsiveSlider }))
  }
  function toggleComments() {
    useCanvasStore.setState(s => ({ showComments: !s.showComments }))
  }
  function toggleSketch() {
    useCanvasStore.getState().setSketchMode(!sketchMode)
  }

  // ── Studio mode toolbar ──────────────────────────────────────────────────
  if (studioMode) {
    return (
      <header className="h-11 bg-deep border-b border-white/[0.06] flex items-center px-3 gap-3 flex-shrink-0 z-20">
        <button
          onClick={() => setStudioMode(false)}
          className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[1.5px] text-white/30 hover:text-white/60 transition-colors"
        >
          <span className="text-[11px]">←</span>
          Canvas
        </button>

        <div className="w-px h-5 bg-white/[0.06]" />

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-neon rounded-[4px] flex items-center justify-center">
            <span className="text-void font-mono font-black text-[9px]">S</span>
          </div>
          <span className="font-mono text-[9px] text-white/30 uppercase tracking-[2px]">
            Studio{file?.name ? ` — ${file.name}` : ''}
          </span>
        </div>

        <div className="flex-1" />

        <SaveStatusDot status={saveStatus} />

        <div className="w-px h-5 bg-white/[0.06]" />

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[8px] text-white/20">credits</span>
          <span className="font-mono text-[11px] text-neon font-medium">{credits}</span>
        </div>

        <div className="w-px h-5 bg-white/[0.06]" />

        <button
          onClick={handleLogout}
          className="font-mono text-[8px] uppercase tracking-[1px] text-white/20 hover:text-white/50 transition-colors"
        >
          Sign out
        </button>
      </header>
    )
  }

  // ── Canvas mode toolbar ──────────────────────────────────────────────────
  const hasSelection = selectedNodeIds.length > 0

  return (
    <header className="h-11 bg-deep border-b border-white/[0.06] flex items-center px-3 gap-2 flex-shrink-0 z-20">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-2 flex-shrink-0">
        <div className="w-5 h-5 bg-neon rounded-[4px] flex items-center justify-center">
          <span className="text-void font-mono font-black text-[9px]">S</span>
        </div>
        <span className="font-mono text-[9px] text-white/30 uppercase tracking-[2px] hidden sm:block">
          {file?.name ?? 'Canvas'}
        </span>
      </div>

      <div className="w-px h-5 bg-white/[0.06] flex-shrink-0" />

      {/* Draw tools */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            className={`
              w-8 h-8 rounded-md flex items-center justify-center font-mono text-[12px] transition-all
              ${activeTool === tool.id
                ? 'bg-neon/10 text-neon border border-neon/25'
                : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
              }
            `}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-white/[0.06] flex-shrink-0" />

      {/* AI + Comment + Sketch */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setActiveTool('ai')}
          title="AI Generate (A)"
          className={`
            w-8 h-8 rounded-md flex items-center justify-center font-mono text-[12px] transition-all
            ${activeTool === 'ai'
              ? 'bg-neon/10 text-neon border border-neon/25'
              : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
            }
          `}
        >
          ⚡
        </button>

        <button
          onClick={() => setActiveTool('comment')}
          title="Comment (C)"
          className={`
            w-8 h-8 rounded-md flex items-center justify-center font-mono text-[12px] transition-all
            ${activeTool === 'comment'
              ? 'bg-neon/10 text-neon border border-neon/25'
              : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
            }
          `}
        >
          💬
        </button>

        <button
          onClick={toggleSketch}
          title="Sketch mode"
          className={`
            w-8 h-8 rounded-md flex items-center justify-center font-mono text-[12px] transition-all
            ${sketchMode
              ? 'bg-neon/10 text-neon border border-neon/25'
              : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04] border border-transparent'
            }
          `}
        >
          ✏
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View toggles */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggleResponsive}
          title="Responsive preview"
          className={`px-2 h-7 rounded font-mono text-[8px] uppercase tracking-[0.8px] transition-all border ${
            showResponsiveSlider
              ? 'bg-neon/10 text-neon border-neon/25'
              : 'text-white/25 border-transparent hover:text-white/50 hover:bg-white/[0.04]'
          }`}
        >
          Resp
        </button>

        <button
          onClick={toggleComments}
          title="Toggle comments"
          className={`px-2 h-7 rounded font-mono text-[8px] uppercase tracking-[0.8px] transition-all border ${
            showComments
              ? 'bg-neon/10 text-neon border-neon/25'
              : 'text-white/25 border-transparent hover:text-white/50 hover:bg-white/[0.04]'
          }`}
        >
          Notes
        </button>

        <button
          onClick={toggleLinter}
          title="Toggle linter"
          className={`px-2 h-7 rounded font-mono text-[8px] uppercase tracking-[0.8px] transition-all border ${
            showLinterPanel
              ? 'bg-neon/10 text-neon border-neon/25'
              : 'text-white/25 border-transparent hover:text-white/50 hover:bg-white/[0.04]'
          }`}
        >
          Lint
        </button>
      </div>

      <div className="w-px h-5 bg-white/[0.06] flex-shrink-0" />

      {/* Studio button */}
      <button
        onClick={() => setStudioMode(true)}
        title={hasSelection ? 'Build selected frame in Studio' : 'Open Studio'}
        className={`px-3 h-7 rounded font-mono text-[8px] uppercase tracking-[0.8px] transition-all border flex items-center gap-1.5 ${
          hasSelection
            ? 'bg-neon/10 text-neon border-neon/25 hover:bg-neon/20'
            : 'text-white/25 border-transparent hover:text-neon/60 hover:border-neon/15 hover:bg-neon/[0.04]'
        }`}
      >
        {hasSelection && <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />}
        Studio
      </button>

      <div className="w-px h-5 bg-white/[0.06] flex-shrink-0" />

      {/* Save status + credits */}
      <SaveStatusDot status={saveStatus} />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="font-mono text-[8px] text-white/20">credits</span>
        <span className="font-mono text-[11px] text-neon font-medium">{credits}</span>
      </div>

      <div className="w-px h-5 bg-white/[0.06] flex-shrink-0" />

      {/* Projects link */}
      <Link
        href="/projects"
        className="font-mono text-[8px] uppercase tracking-[1px] text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
      >
        Projects
      </Link>
    </header>
  )
}

function SaveStatusDot({ status }: { status: 'loading' | 'unsaved' | 'saving' | 'saved' }) {
  if (status === 'saved') return null
  const label = status === 'loading' ? 'loading' : status === 'saving' ? 'saving…' : 'unsaved'
  const color = status === 'unsaved' ? 'text-warn/60' : 'text-white/25'
  return (
    <span className={`font-mono text-[8px] uppercase tracking-[1px] ${color} flex-shrink-0`}>
      {label}
    </span>
  )
}

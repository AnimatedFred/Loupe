'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Project } from '@/lib/supabase'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error && data) setProjects(data)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email ?? null)
      await loadProjects()
      setLoading(false)
    }
    init()
  }, [router, loadProjects])

  async function createProject() {
    setCreating(true)
    setCreateError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: 'Untitled', user_id: session.user.id, canvas_data: null, studio_files: null })
      .select()
      .single()
    setCreating(false)
    if (error) { setCreateError(`${error.code}: ${error.message}`); return }
    if (data) router.push(`/canvas/${data.id}`)
  }

  async function deleteProject(id: string) {
    setDeletingId(id)
    await supabase.from('projects').delete().eq('id', id)
    setProjects(ps => ps.filter(p => p.id !== id))
    setDeletingId(null)
  }

  async function renameProject(id: string, name: string) {
    if (!name.trim()) return
    await supabase.from('projects').update({ name }).eq('id', id)
    setProjects(ps => ps.map(p => p.id === id ? { ...p, name } : p))
    setRenamingId(null)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <span className="font-mono text-[11px] text-white/20 animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Header */}
      <header className="h-11 border-b border-white/[0.06] flex items-center px-6 gap-4 flex-shrink-0 bg-deep">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-neon rounded-[4px] flex items-center justify-center">
            <span className="text-void font-mono font-black text-[9px]">S</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-white/30">Subsrf</span>
        </div>

        <div className="flex-1" />

        <span className="font-mono text-[10px] text-white/20">{userEmail}</span>
        <button
          onClick={logout}
          className="font-mono text-[9px] uppercase tracking-[1px] text-white/20 hover:text-white/50 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        {createError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-err/[0.06] border border-err/15 font-mono text-[11px] text-err/80">
            {createError}
          </div>
        )}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-mono text-[20px] font-semibold text-white/90">Projects</h1>
            <p className="font-mono text-[11px] text-white/25 mt-1">Your design workspaces</p>
          </div>
          <button
            onClick={createProject}
            disabled={creating}
            className="flex items-center gap-2 px-4 h-9 rounded-lg font-mono text-[9px] uppercase tracking-[1.5px] bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all disabled:opacity-40"
          >
            <span className="text-[14px] leading-none">+</span>
            {creating ? 'Creating…' : 'New project'}
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="border border-dashed border-white/[0.08] rounded-xl p-12 text-center">
            <p className="font-mono text-[12px] text-white/20 mb-4">No projects yet</p>
            <button
              onClick={createProject}
              disabled={creating}
              className="px-4 h-8 rounded font-mono text-[9px] uppercase tracking-[1px] bg-neon/10 text-neon border border-neon/20 hover:bg-neon/20 transition-all"
            >
              {creating ? 'Creating…' : 'Create your first project'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                deleting={deletingId === project.id}
                renaming={renamingId === project.id}
                renameValue={renameValue}
                onOpen={() => router.push(`/canvas/${project.id}`)}
                onDelete={() => deleteProject(project.id)}
                onRenameStart={() => { setRenamingId(project.id); setRenameValue(project.name) }}
                onRenameChange={setRenameValue}
                onRenameCommit={() => renameProject(project.id, renameValue)}
                onRenameCancel={() => setRenamingId(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ProjectCardProps {
  project: Project
  deleting: boolean
  renaming: boolean
  renameValue: string
  onOpen: () => void
  onDelete: () => void
  onRenameStart: () => void
  onRenameChange: (v: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
}

function ProjectCard({
  project, deleting, renaming, renameValue,
  onOpen, onDelete, onRenameStart, onRenameChange, onRenameCommit, onRenameCancel,
}: ProjectCardProps) {
  const updatedAt = new Date(project.updated_at)
  const relativeTime = formatRelative(updatedAt)

  return (
    <div className="group bg-deep border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/10 transition-colors">
      {/* Preview area */}
      <button
        onClick={onOpen}
        className="w-full h-36 bg-void/60 flex items-center justify-center hover:bg-void/40 transition-colors relative"
      >
        <div className="w-10 h-10 bg-neon/[0.07] border border-neon/10 rounded-lg flex items-center justify-center">
          <span className="font-mono text-[16px] text-neon/30">⬚</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void/20 pointer-events-none" />
      </button>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={e => onRenameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onRenameCommit()
                if (e.key === 'Escape') onRenameCancel()
              }}
              onBlur={onRenameCommit}
              className="w-full bg-layer border border-neon/25 rounded px-2 py-0.5 font-mono text-[12px] text-white/80 focus:outline-none"
            />
          ) : (
            <button
              onDoubleClick={onRenameStart}
              className="font-mono text-[12px] text-white/70 truncate block w-full text-left hover:text-white/90 transition-colors"
            >
              {project.name}
            </button>
          )}
          <p className="font-mono text-[9px] text-white/20 mt-0.5">{relativeTime}</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRenameStart}
            title="Rename"
            className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/[0.04] transition-colors font-mono text-[10px]"
          >
            ✎
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            title="Delete"
            className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-err/70 hover:bg-err/[0.04] transition-colors font-mono text-[10px]"
          >
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

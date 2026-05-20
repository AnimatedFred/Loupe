'use client'

import React, { useState, useCallback } from 'react'
import { useCanvasStore } from '@/stores/canvas.store'
import type { CanvasNode, DesignToken } from '@/types'
import { colorToHex, colorToRgba } from '@/lib/utils'
import { nanoid } from 'nanoid'

// ── Layer icon ────────────────────────────────────────────────────────────

function nodeIcon(type: CanvasNode['type']): string {
  const icons: Record<string, string> = {
    FRAME: '⬚', COMPONENT: '◈', COMPONENT_INSTANCE: '◈',
    RECTANGLE: '▭', ELLIPSE: '○', TEXT: 'T',
    IMAGE: '⬜', GROUP: '⬡', LINE: '—', ARROW: '→', VECTOR: '✦',
  }
  return icons[type] ?? '⬚'
}

// ── Single layer row ──────────────────────────────────────────────────────

interface LayerRowProps {
  node: CanvasNode
  depth: number
  isSelected: boolean
  isHovered: boolean
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onSelect: (id: string, multi: boolean) => void
  onHover: (id: string | null) => void
  onRename: (id: string, name: string) => void
  violations: import('@/types').ConstraintViolation[]
}

function LayerRow({ node, depth, isSelected, isHovered, expanded, onToggleExpand, onSelect, onHover, onRename, violations }: LayerRowProps) {
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(node.name)
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expanded.has(node.id)
  const nodeViolations = violations.filter(v => v.nodeId === node.id)
  const hasCritical = nodeViolations.some(v => v.severity === 'critical')
  const hasWarning  = nodeViolations.some(v => v.severity === 'warning')

  return (
    <>
      <div
        className={`
          flex items-center gap-1 h-7 px-2 rounded cursor-pointer group transition-all select-none
          ${isSelected ? 'bg-blue/10 text-blue border border-blue/20' : isHovered ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}
        `}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={e => onSelect(node.id, e.shiftKey || e.metaKey)}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onDoubleClick={() => { setRenaming(true); setRenameVal(node.name) }}
      >
        {/* Chevron */}
        <button
          className="w-3 h-3 flex items-center justify-center text-[8px] text-white/20 flex-shrink-0"
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggleExpand(node.id) }}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : ' '}
        </button>

        {/* Icon */}
        <span className={`text-[9px] w-3 flex-shrink-0 ${isSelected ? 'text-blue' : 'text-white/25'}`}>
          {nodeIcon(node.type)}
        </span>

        {/* Name */}
        {renaming ? (
          <input
            autoFocus
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={() => { onRename(node.id, renameVal); setRenaming(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(node.id, renameVal); setRenaming(false) } if (e.key === 'Escape') setRenaming(false) }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-surface border border-neon/30 rounded px-1 text-[10px] font-mono text-t1 outline-none min-w-0"
          />
        ) : (
          <span className={`flex-1 text-[10px] truncate font-mono ${isSelected ? 'text-t1' : 'text-white/50'}`}>
            {node.name}
          </span>
        )}

        {/* Violation indicator */}
        {hasCritical && <span className="text-[8px] text-err flex-shrink-0">●</span>}
        {!hasCritical && hasWarning && <span className="text-[8px] text-warn flex-shrink-0">●</span>}

        {/* Quick actions */}
        <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
          <button
            className="text-[9px] text-white/25 hover:text-white/60 px-0.5"
            onClick={e => { e.stopPropagation(); useCanvasStore.getState().setNodeVisibility(node.id, !node.visible) }}
            title={node.visible ? 'Hide' : 'Show'}
          >
            {node.visible ? '👁' : '🙈'}
          </button>
          <button
            className="text-[9px] text-white/25 hover:text-white/60 px-0.5"
            onClick={e => { e.stopPropagation(); useCanvasStore.getState().lockNode(node.id, !node.locked) }}
            title={node.locked ? 'Unlock' : 'Lock'}
          >
            {node.locked ? '🔒' : '🔓'}
          </button>
        </div>

        {/* Locked/hidden badges */}
        {!node.visible && <span className="text-[8px] text-white/15 flex-shrink-0">◌</span>}
        {node.locked   && <span className="text-[8px] text-white/15 flex-shrink-0">🔒</span>}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && node.children!.map(child => (
        <LayerRow
          key={child.id}
          node={child}
          depth={depth + 1}
          isSelected={false}
          isHovered={false}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          onSelect={onSelect}
          onHover={onHover}
          onRename={onRename}
          violations={violations}
        />
      ))}
    </>
  )
}

// ── Pages tab ─────────────────────────────────────────────────────────────

function PagesTab() {
  const { file, activePageId, setActivePage, addPage, renamePage, deletePage } = useCanvasStore()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  if (!file) return null

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {file.pages.map(page => (
        <div
          key={page.id}
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group transition-all
            ${activePageId === page.id ? 'bg-neon/10 border border-neon/15' : 'hover:bg-white/[0.04]'}
          `}
          onClick={() => setActivePage(page.id)}
        >
          <span className="text-[9px] text-white/25">⬚</span>
          {renamingId === page.id ? (
            <input
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onBlur={() => { renamePage(page.id, renameVal); setRenamingId(null) }}
              onKeyDown={e => { if (e.key === 'Enter') { renamePage(page.id, renameVal); setRenamingId(null) } }}
              onClick={e => e.stopPropagation()}
              className="flex-1 bg-surface border border-neon/30 rounded px-1 text-[10px] font-mono text-t1 outline-none"
            />
          ) : (
            <span className={`flex-1 font-mono text-[10px] ${activePageId === page.id ? 'text-neon' : 'text-white/50'}`}>
              {page.name}
            </span>
          )}
          <div className="hidden group-hover:flex gap-1">
            <button
              className="text-[9px] text-white/25 hover:text-white/60"
              onClick={e => { e.stopPropagation(); setRenamingId(page.id); setRenameVal(page.name) }}
            >✎</button>
            {file.pages.length > 1 && (
              <button
                className="text-[9px] text-white/25 hover:text-err"
                onClick={e => { e.stopPropagation(); deletePage(page.id) }}
              >✕</button>
            )}
          </div>
        </div>
      ))}
      <button
        className="flex items-center gap-1 px-2 py-1.5 rounded font-mono text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all"
        onClick={() => addPage()}
      >
        + Add page
      </button>
    </div>
  )
}

// ── Token row ─────────────────────────────────────────────────────────────

function TokenRow({ token }: { token: DesignToken }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(String(token.value)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] cursor-pointer group"
      onClick={copy}
    >
      {/* Color preview */}
      {token.category === 'color' && (
        <div
          className="w-4 h-4 rounded-[3px] flex-shrink-0 border border-white/10"
          style={{ background: String(token.value) }}
        />
      )}
      {token.category === 'spacing' && (
        <div className="w-4 h-4 flex items-end flex-shrink-0">
          <div className="bg-neon/30 border-r border-neon/60 h-full" style={{ width: Math.min(16, parseInt(String(token.value)) / 8) }} />
        </div>
      )}
      {token.category === 'radius' && (
        <div
          className="w-4 h-4 bg-white/10 flex-shrink-0 border border-white/20"
          style={{ borderRadius: String(token.value) }}
        />
      )}
      {!['color','spacing','radius'].includes(token.category) && (
        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-[8px] text-white/25">◆</div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-mono text-[9px] text-white/50 truncate">{token.name}</div>
        <div className="font-mono text-[8px] text-white/25 truncate">{String(token.value)}</div>
      </div>

      <span className={`font-mono text-[8px] transition-all ${copied ? 'text-neon' : 'text-white/0 group-hover:text-white/25'}`}>
        {copied ? '✓' : '⎘'}
      </span>
    </div>
  )
}

// ── Tokens tab ────────────────────────────────────────────────────────────

function TokensTab() {
  const { file, importTokensFromScan } = useCanvasStore()
  const [scanUrl, setScanUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')

  const tokens = file?.tokenSet.tokens ?? []
  const categories = ['all', 'color', 'typography', 'spacing', 'radius', 'shadow', 'transition']

  const filtered = filterCat === 'all' ? tokens : tokens.filter(t => t.category === filterCat)

  async function handleScan() {
    if (!scanUrl) return
    setScanning(true)
    await importTokensFromScan(scanUrl)
    setScanning(false)
    setScanUrl('')
  }

  return (
    <div className="flex flex-col gap-0 flex-1 min-h-0">
      {/* Scan import */}
      <div className="p-2 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex gap-1">
          <input
            type="text"
            placeholder="Import from URL…"
            value={scanUrl}
            onChange={e => setScanUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            className="flex-1 bg-surface border border-white/[0.08] rounded px-2 py-1 font-mono text-[10px] text-white/60 placeholder-white/20 outline-none focus:border-neon/30 text-[9px]"
          />
          <button
            onClick={handleScan}
            disabled={scanning || !scanUrl}
            className="px-2 py-1 bg-neon text-void rounded font-mono text-[9px] font-semibold disabled:opacity-40"
          >
            {scanning ? '…' : '→'}
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 p-2 flex-wrap border-b border-white/[0.06] flex-shrink-0">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-2 py-0.5 rounded font-mono text-[8px] capitalize transition-all ${
              filterCat === c ? 'bg-neon/10 text-neon border border-neon/20' : 'text-white/30 hover:text-white/50 border border-transparent'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-y-auto p-1">
        {filtered.length === 0 ? (
          <p className="font-mono text-[9px] text-white/20 text-center py-6">No tokens</p>
        ) : (
          filtered.map(t => <TokenRow key={t.name} token={t} />)
        )}
      </div>
    </div>
  )
}

// ── Components tab ────────────────────────────────────────────────────────

function ComponentsTab() {
  const { file, selectedNodeIds } = useCanvasStore()
  const components = file?.components ?? []

  function createFromSelection() {
    const name = prompt('Component name:')
    if (!name || selectedNodeIds.length === 0) return
    useCanvasStore.getState().createComponent(selectedNodeIds[0], name)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-2 border-b border-white/[0.06] flex-shrink-0">
        <button
          onClick={createFromSelection}
          disabled={selectedNodeIds.length === 0}
          className="w-full py-1.5 bg-neon/10 border border-neon/20 rounded font-mono text-[9px] text-neon hover:bg-neon/15 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          + Create component from selection
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {components.length === 0 ? (
          <p className="font-mono text-[9px] text-white/20 text-center py-6">No components yet</p>
        ) : (
          components.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] cursor-pointer group">
              <span className="text-[9px] text-blue/60">◈</span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] text-white/60 truncate">{c.name}</div>
                <div className="font-mono text-[8px] text-white/25">{c.variants.length} variants · {c.usageCount} uses</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Layers tab ────────────────────────────────────────────────────────────

function LayersTab() {
  const {
    activePage, selectedNodeIds, hoveredNodeId,
    setSelectedNodes, addToSelection, setHoveredNode,
    updateNode, violations,
  } = useCanvasStore()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleSelect = useCallback((id: string, multi: boolean) => {
    if (multi) addToSelection(id)
    else setSelectedNodes([id])
    useCanvasStore.getState().setActiveRightPanel('design')
  }, [setSelectedNodes, addToSelection])

  const handleRename = useCallback((id: string, name: string) => {
    updateNode(id, { name })
  }, [updateNode])

  const nodes = activePage?.nodes ?? []
  const filtered = search
    ? nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase()))
    : nodes

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search */}
      <div className="p-2 border-b border-white/[0.06] flex-shrink-0">
        <input
          placeholder="Search layers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface border border-white/[0.08] rounded px-2 py-1 font-mono text-[10px] text-white/60 placeholder-white/20 outline-none"
        />
      </div>

      {/* Layer tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {filtered.length === 0 ? (
          <p className="font-mono text-[9px] text-white/20 text-center py-6">
            {search ? 'No results' : 'No layers'}
          </p>
        ) : (
          [...filtered].reverse().map(node => (
            <LayerRow
              key={node.id}
              node={node}
              depth={0}
              isSelected={selectedNodeIds.includes(node.id)}
              isHovered={hoveredNodeId === node.id}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onSelect={handleSelect}
              onHover={setHoveredNode}
              onRename={handleRename}
              violations={violations}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Left panel ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'layers',     label: 'Layers'     },
  { id: 'components', label: 'Comps'      },
  { id: 'tokens',     label: 'Tokens'     },
  { id: 'assets',     label: 'Assets'     },
  { id: 'pages',      label: 'Pages'      },
] as const

export function LeftPanel() {
  const { activeLeftPanel, setActiveLeftPanel } = useCanvasStore()

  return (
    <aside className="w-[220px] bg-deep border-r border-white/[0.06] flex flex-col overflow-hidden flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveLeftPanel(tab.id)}
            className={`
              flex-1 py-2 font-mono text-[8px] uppercase tracking-[1px] transition-all border-b-2
              ${activeLeftPanel === tab.id
                ? 'text-neon border-neon'
                : 'text-white/25 border-transparent hover:text-white/40'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeLeftPanel === 'layers'     && <LayersTab />}
        {activeLeftPanel === 'pages'      && <PagesTab />}
        {activeLeftPanel === 'tokens'     && <TokensTab />}
        {activeLeftPanel === 'components' && <ComponentsTab />}
        {activeLeftPanel === 'assets'     && (
          <div className="flex items-center justify-center flex-1">
            <p className="font-mono text-[9px] text-white/20">Assets panel coming soon</p>
          </div>
        )}
      </div>
    </aside>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/stores/app.store'
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
  useSandpack,
  defaultDark,
} from '@codesandbox/sandpack-react'

type Tab = 'preview' | 'code' | 'files'

// Syncs Zustand file store → Sandpack without restarting the iframe
function SandpackFileSync() {
  const { sandpack } = useSandpack()
  const files = useAppStore(s => s.files)

  useEffect(() => {
    for (const [path, content] of Object.entries(files)) {
      sandpack.updateFile(path, content)
    }
  }, [files])

  return null
}

export function StudioRight() {
  const [tab, setTab] = useState<Tab>('preview')
  const { files, selectedFile } = useAppStore()

  const initialFiles = useMemo(() => {
    const result: Record<string, { code: string; active?: boolean }> = {}
    for (const [path, content] of Object.entries(files)) {
      result[path] = { code: content, active: path === selectedFile }
    }
    return result
  }, []) // only for initial mount — SandpackFileSync handles updates

  const TABS: { id: Tab; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'code',    label: 'Code'    },
    { id: 'files',   label: 'Files'   },
  ]

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-void">
      <SandpackProvider
        template="react-ts"
        files={initialFiles}
        customSetup={{
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
          entry: '/src/index.tsx',
        }}
        options={{ autorun: true, recompileDelay: 300 }}
        theme={defaultDark}
      >
        <SandpackFileSync />

        {/* Tab bar */}
        <div className="h-10 flex items-center border-b border-white/[0.06] px-3 gap-1 flex-shrink-0 bg-deep">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 h-7 rounded font-mono text-[10px] uppercase tracking-[0.8px] transition-all ${
                tab === t.id
                  ? 'bg-white/[0.07] text-white/80'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Preview bar decorations */}
          {tab === 'preview' && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-md px-3 h-6">
                <div className="w-1.5 h-1.5 rounded-full bg-neon/40" />
                <span className="font-mono text-[9px] text-white/20">localhost</span>
              </div>
            </div>
          )}

          {/* Active file indicator */}
          {tab === 'code' && selectedFile && (
            <span className="ml-auto font-mono text-[9px] text-white/20 truncate max-w-[200px]">
              {selectedFile}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          <div className={tab === 'preview' ? 'h-full' : 'hidden'}>
            <SandpackPreview
              style={{ height: '100%', border: 'none' }}
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton
            />
          </div>

          <div className={tab === 'code' ? 'h-full' : 'hidden'}>
            <SandpackCodeEditor
              style={{ height: '100%' }}
              showLineNumbers
              showInlineErrors
              wrapContent={false}
            />
          </div>

          <div className={tab === 'files' ? 'h-full overflow-y-auto' : 'hidden'}>
            <SandpackFileExplorer style={{ height: '100%' }} />
          </div>
        </div>
      </SandpackProvider>
    </div>
  )
}

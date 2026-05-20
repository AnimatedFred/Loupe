import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface ToolCall {
  name: string
  path?: string
}

export interface StudioMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

const STARTER_FILES: Record<string, string> = {
  '/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Subsrf Studio</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
  '/src/index.tsx': `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)`,
  '/src/App.tsx': `import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-3">
          Hello from Subsrf Studio
        </h1>
        <p className="text-gray-400 text-lg">
          Type a prompt to build your app →
        </p>
      </div>
    </div>
  )
}`,
}

interface AppState {
  files: Record<string, string>
  messages: StudioMessage[]
  agentRunning: boolean
  selectedFile: string | null

  writeFile: (path: string, content: string) => void
  deleteFile: (path: string) => void
  addMessage: (msg: Omit<StudioMessage, 'id'>) => void
  updateLastMessage: (patch: Partial<StudioMessage>) => void
  setAgentRunning: (v: boolean) => void
  setSelectedFile: (path: string | null) => void
  resetFiles: () => void
  loadFiles: (files: Record<string, string>) => void
}

export const useAppStore = create<AppState>((set) => ({
  files: STARTER_FILES,
  messages: [],
  agentRunning: false,
  selectedFile: '/src/App.tsx',

  writeFile: (path, content) =>
    set(s => ({ files: { ...s.files, [path]: content } })),

  deleteFile: (path) =>
    set(s => {
      const next = { ...s.files }
      delete next[path]
      return { files: next }
    }),

  addMessage: (msg) =>
    set(s => ({ messages: [...s.messages, { id: nanoid(), ...msg }] })),

  updateLastMessage: (patch) =>
    set(s => {
      if (!s.messages.length) return s
      const msgs = [...s.messages]
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch }
      return { messages: msgs }
    }),

  setAgentRunning: (v) => set({ agentRunning: v }),
  setSelectedFile: (path) => set({ selectedFile: path }),
  resetFiles: () => set({ files: STARTER_FILES }),
  loadFiles: (files) => set({ files }),
}))

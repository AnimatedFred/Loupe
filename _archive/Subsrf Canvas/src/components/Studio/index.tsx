'use client'

import { StudioChat } from './StudioChat'
import { StudioRight } from './StudioRight'

interface StudioPanelsProps {
  canvasContext?: string
}

export function StudioPanels({ canvasContext }: StudioPanelsProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <StudioChat canvasContext={canvasContext} />
      <StudioRight />
    </div>
  )
}

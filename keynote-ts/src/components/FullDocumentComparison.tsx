'use client'

import { useRef, useEffect, useState } from 'react'
import * as Diff from 'diff'

interface FullDocumentComparisonProps {
  templateText: string
  draftText: string
  highlightedFullDiff?: string
  className?: string
}

export function FullDocumentComparison({
  templateText,
  draftText,
  highlightedFullDiff,
  className = ''
}: FullDocumentComparisonProps) {
  // Refs for synchronized scrolling
  const templateRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLDivElement>(null)
  const [isTemplateScrolling, setIsTemplateScrolling] = useState(false)
  const [isDraftScrolling, setIsDraftScrolling] = useState(false)

  // State for highlighted text
  const [highlightedTemplate, setHighlightedTemplate] = useState<React.ReactNode>(null)
  const [highlightedDraft, setHighlightedDraft] = useState<React.ReactNode>(null)

  // Process text to highlight differences if server-side highlighting isn't available
  useEffect(() => {
    // Only perform client-side highlighting if we don't have server-side highlighting
    if (highlightedFullDiff) return;
    
    // Split text into lines for better diff comparison
    const templateLines = templateText.split('\n')
    const draftLines = draftText.split('\n')
    
    // Process template text 
    const templateHtml: React.ReactNode[] = []
    const draftHtml: React.ReactNode[] = []
    
    // Perform diff by paragraphs
    const diff = Diff.diffLines(templateText, draftText)
    
    diff.forEach((part, index) => {
      // Create appropriate highlighting
      const color = part.added 
        ? 'bg-green-100' 
        : part.removed 
          ? 'bg-red-100' 
          : ''
      
      // Add to appropriate document with highlighting
      if (!part.added) {
        templateHtml.push(
          <span key={`t-${index}`} className={color}>
            {part.value}
          </span>
        )
      }
      
      if (!part.removed) {
        draftHtml.push(
          <span key={`d-${index}`} className={color}>
            {part.value}
          </span>
        )
      }
    })
    
    setHighlightedTemplate(templateHtml)
    setHighlightedDraft(draftHtml)
  }, [templateText, draftText, highlightedFullDiff])
  
  // Function to handle synchronized scrolling
  const handleTemplateScroll = () => {
    if (isTemplateScrolling || !templateRef.current || !draftRef.current) return
    
    setIsDraftScrolling(true)
    const { scrollTop, scrollHeight, clientHeight } = templateRef.current
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
    const draftScrollableHeight = draftRef.current.scrollHeight - draftRef.current.clientHeight
    draftRef.current.scrollTop = scrollPercentage * draftScrollableHeight
    
    // Reset the flag after a short delay
    setTimeout(() => setIsDraftScrolling(false), 50)
  }
  
  const handleDraftScroll = () => {
    if (isDraftScrolling || !templateRef.current || !draftRef.current) return
    
    setIsTemplateScrolling(true)
    const { scrollTop, scrollHeight, clientHeight } = draftRef.current
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
    const templateScrollableHeight = templateRef.current.scrollHeight - templateRef.current.clientHeight
    templateRef.current.scrollTop = scrollPercentage * templateScrollableHeight
    
    // Reset the flag after a short delay
    setTimeout(() => setIsTemplateScrolling(false), 50)
  }
  
  // Attach scroll event listeners
  useEffect(() => {
    const templateElement = templateRef.current
    const draftElement = draftRef.current
    
    if (templateElement) {
      templateElement.addEventListener('scroll', handleTemplateScroll)
    }
    
    if (draftElement) {
      draftElement.addEventListener('scroll', handleDraftScroll)
    }
    
    return () => {
      if (templateElement) {
        templateElement.removeEventListener('scroll', handleTemplateScroll)
      }
      
      if (draftElement) {
        draftElement.removeEventListener('scroll', handleDraftScroll)
      }
    }
  }, [])

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-blue-900">
            Full Document Comparison
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Green highlights show additions in the draft, red highlights show removals from the template.
          </p>
        </div>
        
        {/* Side-by-side text comparison with synchronized scrolling */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Template/Draft version combined with highlighting from server */}
          {highlightedFullDiff ? (
            <div className="p-6 md:col-span-2">
              <div className="sticky top-0 bg-white z-10 pb-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase">Highlighted Changes</h4>
              </div>
              <div 
                className="bg-gray-50 p-4 rounded-lg text-sm max-h-[700px] overflow-y-auto whitespace-pre-wrap font-mono"
              >
                <div dangerouslySetInnerHTML={{ __html: highlightedFullDiff }} />
              </div>
            </div>
          ) : (
            <>
              {/* Template version (client-side highlighting) */}
              <div className="p-6">
                <div className="sticky top-0 bg-white z-10 pb-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase">Template Version</h4>
                </div>
                <div 
                  ref={templateRef}
                  className="bg-gray-50 p-4 rounded-lg text-sm max-h-[700px] overflow-y-auto whitespace-pre-wrap font-mono"
                >
                  {highlightedTemplate}
                </div>
              </div>
              
              {/* Draft version (client-side highlighting) */}
              <div className="p-6">
                <div className="sticky top-0 bg-white z-10 pb-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase">Draft Version</h4>
                </div>
                <div 
                  ref={draftRef}
                  className="bg-gray-50 p-4 rounded-lg text-sm max-h-[700px] overflow-y-auto whitespace-pre-wrap font-mono"
                >
                  {highlightedDraft}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
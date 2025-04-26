'use client'

import { useState, useRef, useEffect } from 'react'

interface Clause {
  clause_type: string
  text: string
  confidence: number
}

interface ComparisonItem {
  clause_type: string
  template_text: string
  draft_text: string
  analysis: string
  risk_score: number
}

interface ComparisonResultsProps {
  templateClauses: Clause[]
  draftClauses: Clause[]
  comparison: ComparisonItem[]
  className?: string
}

export function ComparisonResults({
  templateClauses,
  draftClauses,
  comparison,
  className = '',
}: ComparisonResultsProps) {
  const [selectedClauseType, setSelectedClauseType] = useState<string | null>(
    comparison.length > 0 ? comparison[0].clause_type : null
  )
  
  // Refs for synchronized scrolling
  const templateRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<HTMLDivElement>(null)
  const [isTemplateScrolling, setIsTemplateScrolling] = useState(false)
  const [isDraftScrolling, setIsDraftScrolling] = useState(false)

  // Find the current comparison item based on selectedClauseType
  const currentComparison = comparison.find(
    (item) => item.clause_type === selectedClauseType
  )

  // Function to get risk color based on score
  const getRiskColor = (score: number) => {
    if (score <= 3) return 'bg-green-100 text-green-800'
    if (score <= 7) return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  }
  
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
  }, [currentComparison])

  // Function to highlight differences between the texts
  const getDiffStyles = (text: string, referenceText: string) => {
    if (!text || !referenceText) return text

    // This is a simplified approach - a real diff would use a proper diff algorithm
    // For now, we'll just add a background color to make it stand out
    // A more robust implementation would use a library like 'diff' or 'jsdiff'
    return text
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar with clause types */}
        <div className="w-full md:w-64 flex-shrink-0 bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">Clause Types</h3>
          <div className="space-y-2">
            {comparison.map((item) => (
              <button
                key={item.clause_type}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedClauseType === item.clause_type
                    ? 'bg-blue-100 text-blue-800'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
                onClick={() => setSelectedClauseType(item.clause_type)}
              >
                <div className="flex justify-between items-center">
                  <span className="capitalize">{item.clause_type}</span>
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getRiskColor(
                      item.risk_score
                    )}`}
                  >
                    {item.risk_score}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main content with comparison details */}
        <div className="flex-1">
          {currentComparison ? (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-blue-900 capitalize">
                    {currentComparison.clause_type}
                  </h3>
                </div>
                
                {/* Analysis panel */}
                <div className="p-6 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Analysis</h4>
                  <div className={`p-4 rounded-lg ${getRiskColor(currentComparison.risk_score)}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        {currentComparison.risk_score > 7 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : currentComparison.risk_score > 3 ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="ml-2 text-sm">{currentComparison.analysis}</p>
                    </div>
                  </div>
                </div>
                
                {/* Side-by-side text comparison with synchronized scrolling */}
                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {/* Template version */}
                  <div className="p-6">
                    <div className="sticky top-0 bg-white z-10 pb-2">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase">Template Version</h4>
                    </div>
                    {currentComparison.template_text ? (
                      <div 
                        ref={templateRef}
                        className="bg-gray-50 p-4 rounded-lg text-sm max-h-[400px] overflow-y-auto"
                      >
                        {getDiffStyles(currentComparison.template_text, currentComparison.draft_text)}
                      </div>
                    ) : (
                      <div className="bg-red-50 p-4 rounded-lg text-sm text-red-700">
                        This clause is missing in the template document.
                      </div>
                    )}
                  </div>
                  
                  {/* Draft version */}
                  <div className="p-6">
                    <div className="sticky top-0 bg-white z-10 pb-2">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase">Draft Version</h4>
                    </div>
                    {currentComparison.draft_text ? (
                      <div 
                        ref={draftRef}
                        className="bg-gray-50 p-4 rounded-lg text-sm max-h-[400px] overflow-y-auto"
                      >
                        {getDiffStyles(currentComparison.draft_text, currentComparison.template_text)}
                      </div>
                    ) : (
                      <div className="bg-red-50 p-4 rounded-lg text-sm text-red-700">
                        This clause is missing in the draft document.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No clauses to compare.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useRef, useEffect } from 'react'
import * as Diff from 'diff'

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
  highlighted_diff?: string
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

  // Amendment generation states
  const [showAmendmentPanel, setShowAmendmentPanel] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [amendment, setAmendment] = useState('')
  const [amendmentTitle, setAmendmentTitle] = useState('')
  const [explanation, setExplanation] = useState('')
  const [isGeneratingAmendment, setIsGeneratingAmendment] = useState(false)
  const [amendmentError, setAmendmentError] = useState('')

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

  // Reset amendment state when changing selected clause
  useEffect(() => {
    setAmendment('');
    setAmendmentTitle('');
    setExplanation('');
    setAmendmentError('');
    setShowAmendmentPanel(false);
  }, [selectedClauseType]);

  // Function to generate amendment for the current clause
  const generateAmendment = async () => {
    if (!currentComparison) return;
    
    setIsGeneratingAmendment(true);
    setAmendmentError('');
    
    try {
      const response = await fetch('http://localhost:5001/api/generate-amendment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_text: currentComparison.template_text,
          draft_text: currentComparison.draft_text,
          clause_type: currentComparison.clause_type,
          analysis: currentComparison.analysis,
          custom_prompt: showCustomPrompt ? customPrompt : ''
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAmendment(data.amendment);
        setAmendmentTitle(data.amendment_title || `${currentComparison.clause_type} Amendment`);
        setExplanation(data.explanation || 'No explanation provided.');
      } else {
        setAmendmentError(data.error || 'Failed to generate amendment');
      }
    } catch (error) {
      setAmendmentError('Network error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingAmendment(false);
    }
  };

  // Function to copy amendment text to clipboard
  const copyAmendmentToClipboard = () => {
    navigator.clipboard.writeText(amendment);
    // Could add a toast notification here
  };

  // Default prompt template for user customization
  const defaultPromptTemplate = `You are a legal expert tasked with drafting an amendment to resolve differences between 
clauses in a contract negotiation. Here are the details:

CLAUSE TYPE: {clause_type}

TEMPLATE VERSION:
{template_text}

DRAFT VERSION:
{draft_text}

ANALYSIS OF DIFFERENCES:
{analysis}

Please draft a balanced amendment that:
1. Addresses the key differences between the versions
2. Creates a fair compromise that protects both parties' interests
3. Uses clear, precise legal language
4. Is formatted as a proper contract clause

Provide ONLY the text of the proposed amendment without additional explanation.`;

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
                        className="bg-gray-50 p-4 rounded-lg text-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap"
                      >
                        {currentComparison.highlighted_diff ? (
                          <div dangerouslySetInnerHTML={{ __html: currentComparison.highlighted_diff }} />
                        ) : (
                          // Fallback to client-side diffing if highlighted diff isn't available from API
                          getDiffStyles(currentComparison.template_text, currentComparison.draft_text)
                        )}
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
                        className="bg-gray-50 p-4 rounded-lg text-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap"
                      >
                        {currentComparison.highlighted_diff ? (
                          <div dangerouslySetInnerHTML={{ __html: currentComparison.highlighted_diff }} />
                        ) : (
                          // Fallback to client-side diffing if highlighted diff isn't available from API
                          getDiffStyles(currentComparison.draft_text, currentComparison.template_text)
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 p-4 rounded-lg text-sm text-red-700">
                        This clause is missing in the draft document.
                      </div>
                    )}
                  </div>
                </div>

                {/* Amendment generation button */}
                <div className="flex items-center justify-center p-4 border-t border-gray-200 bg-gray-50">
                  {!showAmendmentPanel ? (
                    <button
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-4 rounded-lg border border-blue-200 flex items-center transition-colors"
                      onClick={() => setShowAmendmentPanel(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Generate Amendment Suggestion
                    </button>
                  ) : (
                    <button
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg border border-gray-300 flex items-center transition-colors"
                      onClick={() => setShowAmendmentPanel(false)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Hide Amendment Panel
                    </button>
                  )}
                </div>

                {/* Amendment panel - only visible when showAmendmentPanel is true */}
                {showAmendmentPanel && (
                  <div className="border-t border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4">Amendment Suggestion</h4>
                    
                    {/* Prompt customization toggle */}
                    <div className="mb-4 flex items-center">
                      <label className="flex items-center cursor-pointer">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={showCustomPrompt}
                            onChange={() => {
                              if (!showCustomPrompt && !customPrompt) {
                                setCustomPrompt(defaultPromptTemplate);
                              }
                              setShowCustomPrompt(!showCustomPrompt);
                            }}
                          />
                          <div className={`block w-10 h-6 rounded-full transition-colors ${showCustomPrompt ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
                          <div className={`dot absolute left-1 top-1 w-4 h-4 rounded-full transition transform ${showCustomPrompt ? 'translate-x-4 bg-white' : 'bg-white'}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-gray-700">
                          Customize prompt
                        </div>
                      </label>
                    </div>
                    
                    {/* Prompt customization area */}
                    {showCustomPrompt && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Prompt Template
                        </label>
                        <div className="text-xs text-gray-500 mb-2">
                          Use placeholders: {'{clause_type}'}, {'{template_text}'}, {'{draft_text}'}, {'{analysis}'}
                        </div>
                        <textarea
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          className="w-full h-60 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your custom prompt template..."
                        />
                      </div>
                    )}
                    
                    {/* Generate button */}
                    <div className="mb-6">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg flex items-center justify-center transition-colors"
                        onClick={generateAmendment}
                        disabled={isGeneratingAmendment}
                      >
                        {isGeneratingAmendment ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Generate Amendment
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Error message */}
                    {amendmentError && (
                      <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                        {amendmentError}
                      </div>
                    )}
                    
                    {/* Amendment result */}
                    {amendment && (
                      <div className="relative">
                        <div className="absolute top-3 right-3">
                          <button
                            onClick={copyAmendmentToClipboard}
                            className="text-gray-500 hover:text-gray-700 p-1"
                            title="Copy to clipboard"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                            </svg>
                          </button>
                        </div>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-sm whitespace-pre-wrap">
                          <h5 className="font-semibold mb-2">{amendmentTitle}</h5>
                          <p>{amendment}</p>
                          <p className="mt-4 text-gray-600 text-sm">{explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
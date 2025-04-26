'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/Button'
import { DiamondIcon } from '@/components/DiamondIcon'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { SyncScrollPanels } from '@/components/SyncScrollPanels'
import clsx from 'clsx'

interface Clause {
  clause_type: string
  text: string
  confidence: number
}

interface ComparisonResult {
  clause_type: string
  template_text: string
  draft_text: string
  analysis: string
  risk_score: number
}

interface AnalysisResponse {
  template_clauses: Clause[]
  draft_clauses: Clause[]
  comparison: ComparisonResult[]
  overall_risk: number
  template_text?: string // Full text of the template document
  draft_text?: string // Full text of the draft document
}

export function ContractAnalyzer() {
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'results' | 'full-documents'>('results')
  const templateDropzoneRef = useRef<HTMLDivElement>(null)
  const draftDropzoneRef = useRef<HTMLDivElement>(null)
  
  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTemplateFile(e.target.files[0])
    }
  }
  
  const handleDraftFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDraftFile(e.target.files[0])
    }
  }
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.add('bg-blue-50')
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('bg-blue-50')
  }
  
  const handleTemplateDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('bg-blue-50')
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setTemplateFile(file)
      } else {
        setError('Only PDF and DOCX files are accepted')
      }
    }
  }
  
  const handleDraftDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('bg-blue-50')
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setDraftFile(file)
      } else {
        setError('Only PDF and DOCX files are accepted')
      }
    }
  }
  
  const analyzeContracts = async () => {
    if (!templateFile || !draftFile) {
      setError('Both template and draft files are required')
      return
    }
    
    setIsAnalyzing(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('template', templateFile)
    formData.append('draft', draftFile)
    formData.append('include_full_text', 'true') // Request the full text in the response
    
    try {
      console.log('Sending request to API with files:', {
        templateName: templateFile.name,
        templateSize: templateFile.size,
        templateType: templateFile.type,
        draftName: draftFile.name,
        draftSize: draftFile.size,
        draftType: draftFile.type
      })
      
      const response = await fetch('http://localhost:5000/api/compare', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`Server responded with ${response.status}: ${errorText}`)
      }
      
      const result = await response.json()
      console.log('Received successful response:', result)
      
      if (!result.template_text) {
        result.template_text = "Full document text not available. Please update the backend to include full document text in the response."
      }
      if (!result.draft_text) {
        result.draft_text = "Full document text not available. Please update the backend to include full document text in the response."
      }
      
      setAnalysisResult(result)
    } catch (error: any) {
      console.error('Error analyzing contracts:', error)
      setError(`Failed to analyze contracts: ${error.message || 'Unknown error'}. Please check the console for more details.`)
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600'
    if (score <= 6) return 'text-orange-500'
    return 'text-red-600'
  }

  const getBackgroundRiskColor = (score: number) => {
    if (score <= 3) return 'bg-green-100'
    if (score <= 6) return 'bg-orange-100'
    return 'bg-red-100'
  }
  
  const renderRiskMeter = (score: number) => {
    const percentage = (score / 10) * 100
    return (
      <div className="mt-4">
        <div className="flex items-center mb-1">
          <span className="text-sm font-semibold mr-2">Risk Score:</span>
          <span className={`text-lg font-bold ${getRiskColor(score)}`}>{score.toFixed(1)}/10</span>
        </div>
        <div className="h-4 w-full bg-gray-200 rounded-full">
          <div 
            className={`h-4 rounded-full ${score <= 3 ? 'bg-green-500' : score <= 6 ? 'bg-orange-500' : 'bg-red-500'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-green-600">Low</span>
          <span className="text-orange-500">Moderate</span>
          <span className="text-red-600">High</span>
        </div>
      </div>
    )
  }
  
  const renderDocumentContent = (text?: string) => {
    if (!text) return <p className="text-gray-500">No content available</p>
    
    return (
      <div className="whitespace-pre-wrap font-mono text-sm">
        {text}
      </div>
    )
  }
  
  return (
    <div className="mt-12">
      {!analysisResult ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div 
            ref={templateDropzoneRef}
            className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center transition-colors duration-200"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleTemplateDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold">Template Document</h3>
              <p className="text-blue-900">Drag & drop your template contract here, or click to browse</p>
              <input
                type="file"
                id="template-file"
                onChange={handleTemplateFileChange}
                accept=".pdf,.docx"
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('template-file')?.click()}
                className="mt-4"
              >
                Browse Files
              </Button>
              {templateFile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                  <p className="font-medium text-blue-900">{templateFile.name}</p>
                  <p className="text-sm text-blue-700">{(templateFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>
          </div>
          
          <div 
            ref={draftDropzoneRef}
            className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center transition-colors duration-200"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDraftDrop}
          >
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="font-display text-lg font-semibold">Draft Document</h3>
              <p className="text-blue-900">Drag & drop your draft contract here, or click to browse</p>
              <input
                type="file"
                id="draft-file"
                onChange={handleDraftFileChange}
                accept=".pdf,.docx"
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('draft-file')?.click()}
                className="mt-4"
              >
                Browse Files
              </Button>
              {draftFile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-left">
                  <p className="font-medium text-blue-900">{draftFile.name}</p>
                  <p className="text-sm text-blue-700">{(draftFile.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="md:col-span-2 p-4 rounded-lg bg-red-50 text-red-800">
              <p className="font-medium">{error}</p>
            </div>
          )}
          
          <div className="md:col-span-2 flex justify-center">
            <Button
              onClick={analyzeContracts}
              disabled={!templateFile || !draftFile || isAnalyzing}
              className="px-8 py-4 text-lg"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Analyze Contracts'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-blue-900">Analysis Results</h2>
            <div className="flex space-x-4">
              <Button
                onClick={() => setViewMode(viewMode === 'results' ? 'full-documents' : 'results')}
                variant="secondary"
              >
                {viewMode === 'results' ? 'View Full Documents' : 'View Analysis'}
              </Button>
              <Button
                onClick={() => {
                  setAnalysisResult(null)
                  setTemplateFile(null)
                  setDraftFile(null)
                }}
              >
                Analyze New Documents
              </Button>
            </div>
          </div>
          
          {viewMode === 'results' ? (
            <>
              <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
                <h3 className="font-display text-2xl font-semibold mb-4">Overall Risk Assessment</h3>
                {renderRiskMeter(analysisResult.overall_risk)}
                <p className="mt-4 text-blue-900">
                  {analysisResult.overall_risk <= 3 
                    ? 'This contract appears to have low risk. Few or minor discrepancies were found.' 
                    : analysisResult.overall_risk <= 6 
                    ? 'This contract has moderate risk. Some notable differences that may require legal review.' 
                    : 'This contract has high risk. Significant differences that require careful legal review.'}
                </p>
              </div>
              
              <TabGroup>
                <div className="border-b border-blue-200">
                  <TabList className="flex space-x-8">
                    <Tab className={({ selected }) => clsx(
                      'py-4 px-1 border-b-2 font-medium text-lg focus:outline-none',
                      selected 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-blue-900 hover:border-blue-300'
                    )}>
                      Comparison Results
                    </Tab>
                    <Tab className={({ selected }) => clsx(
                      'py-4 px-1 border-b-2 font-medium text-lg focus:outline-none',
                      selected 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-blue-900 hover:border-blue-300'
                    )}>
                      Template Clauses
                    </Tab>
                    <Tab className={({ selected }) => clsx(
                      'py-4 px-1 border-b-2 font-medium text-lg focus:outline-none',
                      selected 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-blue-900 hover:border-blue-300'
                    )}>
                      Draft Clauses
                    </Tab>
                  </TabList>
                </div>
                
                <TabPanels>
                  <TabPanel className="pt-6">
                    <div className="space-y-8">
                      {analysisResult.comparison.map((item, index) => (
                        <div key={index} className="bg-white shadow-md rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-100">
                            <h3 className="font-display text-xl font-semibold text-blue-900 capitalize">
                              {item.clause_type} Clause
                            </h3>
                            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(item.risk_score)} ${getBackgroundRiskColor(item.risk_score)}`}>
                              Risk: {item.risk_score}/10
                            </div>
                          </div>
                          
                          <div className="p-5">
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                              <h4 className="font-semibold mb-2">Analysis</h4>
                              <p>{item.analysis}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-2 text-blue-800">Template Version</h4>
                                <div className="p-4 bg-gray-50 rounded-lg min-h-[100px] text-gray-800 overflow-auto max-h-[300px]">
                                  {item.template_text || <span className="text-gray-500 italic">No text in template</span>}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2 text-blue-800">Draft Version</h4>
                                <div className="p-4 bg-gray-50 rounded-lg min-h-[100px] text-gray-800 overflow-auto max-h-[300px]">
                                  {item.draft_text || <span className="text-gray-500 italic">No text in draft</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabPanel>
                  
                  <TabPanel className="pt-6">
                    <div className="space-y-6">
                      {analysisResult.template_clauses.map((clause, index) => (
                        <div key={index} className="bg-white shadow-md rounded-lg p-5 border border-blue-100">
                          <div className="flex justify-between mb-3">
                            <h3 className="font-display text-lg font-medium text-blue-900 capitalize">
                              {clause.clause_type}
                            </h3>
                            <div className="px-3 py-1 bg-blue-100 rounded-full text-sm text-blue-800">
                              Confidence: {clause.confidence}%
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg text-gray-800">
                            {clause.text}
                          </div>
                        </div>
                      ))}
                      
                      {analysisResult.template_clauses.length === 0 && (
                        <div className="text-center p-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No clauses were identified in the template document.</p>
                        </div>
                      )}
                    </div>
                  </TabPanel>
                  
                  <TabPanel className="pt-6">
                    <div className="space-y-6">
                      {analysisResult.draft_clauses.map((clause, index) => (
                        <div key={index} className="bg-white shadow-md rounded-lg p-5 border border-blue-100">
                          <div className="flex justify-between mb-3">
                            <h3 className="font-display text-lg font-medium text-blue-900 capitalize">
                              {clause.clause_type}
                            </h3>
                            <div className="px-3 py-1 bg-blue-100 rounded-full text-sm text-blue-800">
                              Confidence: {clause.confidence}%
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg text-gray-800">
                            {clause.text}
                          </div>
                        </div>
                      ))}
                      
                      {analysisResult.draft_clauses.length === 0 && (
                        <div className="text-center p-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No clauses were identified in the draft document.</p>
                        </div>
                      )}
                    </div>
                  </TabPanel>
                </TabPanels>
              </TabGroup>
            </>
          ) : (
            <SyncScrollPanels
              leftTitle={templateFile?.name || 'Template Document'}
              rightTitle={draftFile?.name || 'Draft Document'}
              leftContent={renderDocumentContent(analysisResult.template_text)}
              rightContent={renderDocumentContent(analysisResult.draft_text)}
              leftText={analysisResult.template_text}
              rightText={analysisResult.draft_text}
            />
          )}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Container } from '@/components/Container'
import { BackgroundImage } from '@/components/BackgroundImage'
import { FileUploader } from '@/components/FileUploader'
import { Button } from '@/components/Button'
import { RiskMeter } from '@/components/RiskMeter'
import { ComparisonResults } from '@/components/ComparisonResults'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { FullDocumentComparison } from '@/components/FullDocumentComparison'

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

interface AnalysisResult {
  template_clauses: Clause[]
  draft_clauses: Clause[]
  comparison: ComparisonItem[]
  overall_risk: number
  template_text?: string
  draft_text?: string
  highlighted_draft_diff?: string
}

export default function Home() {
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const handleAnalyze = async () => {
    if (!templateFile || !draftFile) {
      setError('Please upload both template and draft files')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('template', templateFile)
      formData.append('draft', draftFile)
      // Request full text for the new full document comparison feature
      formData.append('include_full_text', 'true')

      const response = await fetch('http://localhost:5001/api/compare', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTemplateFile(null)
    setDraftFile(null)
    setResult(null)
    setError(null)
  }

  return (
    <>
      <div className="relative py-20">
        <BackgroundImage className="-top-36 -bottom-14" />
        <Container className="relative">
          <div className="mx-auto max-w-5xl">
            <h1 className="font-display text-5xl font-bold tracking-tighter text-blue-600 sm:text-6xl">
              Conflicto
            </h1>
            <p className="mt-6 text-xl tracking-tight text-blue-900">
              Compare your template and draft contracts to identify key clauses,
              potential conflicts, and risks that may require further legal review.
            </p>

            {/* File upload section */}
            {!result && (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <FileUploader
                  label="Template Contract"
                  onFileSelected={setTemplateFile}
                  selectedFile={templateFile}
                />
                <FileUploader
                  label="Draft Contract"
                  onFileSelected={setDraftFile}
                  selectedFile={draftFile}
                />
                
                {error && (
                  <div className="col-span-full bg-red-50 p-4 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="col-span-full flex justify-center mt-6">
                  <Button 
                    onClick={handleAnalyze}
                    disabled={loading || !templateFile || !draftFile}
                    className="py-3 px-8 text-lg"
                  >
                    {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                    {loading ? 'Analyzing...' : 'Analyze Contracts'}
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="mt-16 text-center">
                <LoadingSpinner size="lg" className="mb-6" />
                <p className="text-lg text-blue-900">
                  Analyzing your contracts. This may take a minute...
                </p>
              </div>
            )}

            {/* Results section */}
            {result && (
              <div className="mt-12">
                <div className="flex flex-col lg:flex-row justify-between items-start mb-12 gap-6">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-blue-900">
                      Analysis Results
                    </h2>
                    <p className="mt-2 text-lg text-blue-700">
                      {result.comparison.length} clauses compared
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <RiskMeter score={result.overall_risk} />
                    <Button onClick={resetForm} className="self-center">
                      Analyze Another Contract
                    </Button>
                  </div>
                </div>
                
                <TabGroup>
                  <TabList className="flex space-x-1 rounded-xl bg-blue-50 p-1 mb-8">
                    <Tab className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                      ${selected 
                        ? 'bg-white shadow text-blue-700' 
                        : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                      }`
                    }>
                      Clauses
                    </Tab>
                    <Tab className={({ selected }) =>
                      `w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                      ${selected 
                        ? 'bg-white shadow text-blue-700' 
                        : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                      }`
                    }>
                      Full Document
                    </Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel>
                      <ComparisonResults
                        templateClauses={result.template_clauses}
                        draftClauses={result.draft_clauses}
                        comparison={result.comparison}
                      />
                    </TabPanel>
                    <TabPanel>
                      {result.template_text && result.draft_text ? (
                        <FullDocumentComparison 
                          templateText={result.template_text}
                          draftText={result.draft_text}
                          highlightedDraftDiff={result.highlighted_draft_diff}
                        />
                      ) : (
                        <div className="bg-amber-50 p-4 rounded-xl text-amber-700 text-sm">
                          Full document text is not available. Please try analyzing the documents again.
                        </div>
                      )}
                    </TabPanel>
                  </TabPanels>
                </TabGroup>
              </div>
            )}
          </div>
        </Container>
      </div>
    </>
  )
}

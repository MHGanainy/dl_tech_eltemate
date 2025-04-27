import { Container } from '@/components/Container'
import { BackgroundImage } from '@/components/BackgroundImage'
import { Button } from '@/components/Button'
import Link from 'next/link'

export default function About() {
  return (
    <div className="relative py-20">
      <BackgroundImage className="-top-36 -bottom-14" />
      <Container className="relative">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl font-bold tracking-tighter text-blue-600 sm:text-6xl">
            About this Tool
          </h1>
          
          <div className="mt-8 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-blue-900">What is the IP Contract Analyzer?</h2>
              <p className="mt-4 text-lg text-blue-900">
                The IP Contract Analyzer is an AI-powered tool designed to help legal professionals
                compare contract documents. It extracts and categorizes key clauses, identifies deviations
                between template and draft versions, and highlights potential risks that may require further review.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-blue-900">Key Features</h2>
              <ul className="mt-4 space-y-2 text-lg text-blue-900 list-disc pl-6">
                <li>Automatic clause extraction and classification</li>
                <li>Side-by-side comparison of template and draft documents</li>
                <li>Risk scoring for each clause and overall document</li>
                <li>Plain-English explanations of identified issues</li>
                <li>Support for PDF and DOCX document formats</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-blue-900">How It Works</h2>
              <ol className="mt-4 space-y-4 text-lg text-blue-900 list-decimal pl-6">
                <li>
                  <strong>Upload Documents</strong>: Start by uploading your template contract and the draft version you want to compare.
                </li>
                <li>
                  <strong>AI Analysis</strong>: Our system uses advanced AI to identify and extract key clauses from both documents,
                  including license scope, ownership, patents challenged, confidentiality term, liability cap, indemnity trigger, 
                  governing law, and assignment rights.
                </li>
                <li>
                  <strong>Comparison</strong>: The system performs a detailed comparison of corresponding clauses between the template
                  and draft versions.
                </li>
                <li>
                  <strong>Risk Assessment</strong>: Each difference is analyzed for potential legal implications and assigned a risk
                  score. The tool also provides an overall risk assessment for the entire document.
                </li>
                <li>
                  <strong>Review Results</strong>: The results are presented in an easy-to-understand format, highlighting the areas
                  that may require further legal review.
                </li>
              </ol>
            </section>
            
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-blue-900">Important Notes</h2>
              <div className="mt-4 space-y-2 text-lg text-blue-900">
                <p>
                  While our tool is designed to assist legal professionals, it should not be considered a replacement for
                  thorough legal review. The analysis provided is intended to highlight potential areas of concern, but
                  all contract decisions should ultimately be made by qualified legal professionals.
                </p>
                <p>
                  Document processing is performed securely, and we do not store the contents of your contracts beyond
                  the duration of the analysis process.
                </p>
              </div>
            </section>
            
            <div className="mt-10 flex justify-center">
              <Button href="/" as={Link}>
                Back to Analyzer
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}
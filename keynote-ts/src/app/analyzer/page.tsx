import { Layout } from '@/components/Layout'
import { Container } from '@/components/Container'
import { ContractAnalyzer } from '@/components/ContractAnalyzer'

export const metadata = {
  title: 'DL Tech Contract Analyzer',
  description: 'Compare legal contracts for key clauses, conflicts, and risks with AI-powered analysis',
}

export default function AnalyzerPage() {
  return (
    <Layout>
      <div className="relative py-20 sm:py-32">
        <Container className="relative">
          <div className="mx-auto max-w-5xl">
            <h1 className="font-display text-5xl font-bold tracking-tighter text-blue-600 sm:text-6xl">
              Contract Analyzer
            </h1>
            <div className="mt-6 space-y-6 font-display text-xl tracking-tight text-blue-900">
              <p>
                Compare legal contracts to identify key clauses, potential conflicts, and risks.
                Upload your template and draft documents to get started.
              </p>
            </div>
            <ContractAnalyzer />
          </div>
        </Container>
      </div>
    </Layout>
  )
}
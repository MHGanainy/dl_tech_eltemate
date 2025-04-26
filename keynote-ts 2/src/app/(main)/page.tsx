import { Hero } from '@/components/Hero'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { BackgroundImage } from '@/components/BackgroundImage'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <div className="relative py-20 sm:pt-36 sm:pb-24">
        <BackgroundImage className="-top-36 -bottom-14" />
        <Container className="relative">
          <div className="mx-auto max-w-2xl lg:max-w-4xl lg:px-12">
            <h1 className="font-display text-5xl font-bold tracking-tighter text-blue-600 sm:text-7xl">
              <span className="sr-only">DL Tech - </span>Legal Contract Analyzer
            </h1>
            <div className="mt-6 space-y-6 font-display text-2xl tracking-tight text-blue-900">
              <p>
                Legal professionals need effective tools to identify risks in contracts. Manual comparison is time-consuming and error-prone.
              </p>
              <p>
                Our AI-powered Contract Analyzer helps you compare legal contracts to identify key clauses, potential conflicts, and risks in seconds.
              </p>
            </div>
            <div className="mt-10 flex justify-center gap-6 sm:justify-start">
              <Button href="/analyzer" className="px-8 py-4 text-lg">
                Try Contract Analyzer
              </Button>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 sm:mt-16 sm:gap-x-16 sm:gap-y-10 sm:text-center lg:auto-cols-auto lg:grid-flow-col lg:grid-cols-none lg:justify-start lg:text-left">
              {[
                ['AI-Powered', 'GPT-4o'],
                ['Supported Files', 'PDF, DOCX'],
                ['Clause Types', '8+'],
                ['Analysis Time', '<60s'],
              ].map(([name, value]) => (
                <div key={name}>
                  <dt className="font-mono text-sm text-blue-600">{name}</dt>
                  <dd className="mt-0.5 text-2xl font-semibold tracking-tight text-blue-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </div>

      <section id="features" className="py-20 sm:py-32">
        <Container>
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-3xl">
            <h2 className="font-display text-4xl font-medium tracking-tighter text-blue-600 sm:text-5xl">
              How It Works
            </h2>
            <p className="mt-4 font-display text-2xl tracking-tight text-blue-900">
              Our Contract Analyzer makes it easy to identify risks and compare legal documents.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Upload Documents',
                description: 'Drag & drop your template and draft contracts in PDF or DOCX format.'
              },
              {
                title: 'AI Analysis',
                description: 'Our AI analyzes your documents, extracts key clauses, and identifies differences.'
              },
              {
                title: 'Review Results',
                description: 'Review the comparison results, see risk scores, and get plain English explanations.'
              },
              {
                title: 'Clause Extraction',
                description: 'Automatically identifies key clauses like license scope, ownership, and confidentiality terms.'
              },
              {
                title: 'Risk Assessment',
                description: 'Each difference is scored for risk, helping you prioritize your review.'
              },
              {
                title: 'Plain English Explanations',
                description: 'Complex legal differences are explained in simple, easy-to-understand language.'
              }
            ].map((feature, featureIndex) => (
              <div key={featureIndex} className="flex flex-col rounded-3xl px-6 py-8 bg-blue-50">
                <h3 className="font-display text-xl font-semibold text-blue-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-lg text-blue-700">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-16 flex justify-center">
            <Button href="/analyzer" className="px-8 py-4 text-lg">
              Start Analyzing Contracts
            </Button>
          </div>
        </Container>
      </section>

      <Footer />
    </>
  )
}

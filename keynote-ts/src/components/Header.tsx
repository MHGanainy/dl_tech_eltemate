import Link from 'next/link'
import { Container } from '@/components/Container'

export function Header() {
  return (
    <header className="relative z-50 flex-none lg:pt-8">
      <Container className="flex flex-wrap items-center justify-center sm:justify-between lg:flex-nowrap">
        <div className="mt-6 lg:mt-0 lg:grow lg:basis-0">
          <Link href="/" className="text-xl font-bold text-blue-600">
            IP Contract Analyzer
          </Link>
        </div>
        <div className="order-first -mx-4 flex flex-auto basis-full overflow-x-auto border-b border-blue-600/10 py-4 font-mono text-sm whitespace-nowrap text-blue-600 sm:-mx-6 lg:order-none lg:mx-0 lg:basis-auto lg:border-0 lg:py-0">
          <div className="mx-auto flex items-center gap-4 px-4">
            <p className="font-semibold">IP Contract Analyzer</p>
          </div>
        </div>
        <div className="hidden sm:mt-10 sm:flex lg:mt-0 lg:grow lg:basis-0 lg:justify-end gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 font-medium text-blue-600 hover:text-blue-500"
          >
            Home
          </Link>
          <Link 
            href="/about" 
            className="inline-flex items-center px-4 py-2 font-medium text-blue-600 hover:text-blue-500"
          >
            About
          </Link>
        </div>
      </Container>
    </header>
  )
}

import { Container } from '@/components/Container'

export function Footer() {
  return (
    <footer className="flex-none py-16 mt-10">
      <Container className="flex flex-col items-center justify-between md:flex-row">
        <p className="text-xl font-bold text-blue-600">IP Contract Analyzer</p>
        <p className="mt-6 text-base text-slate-500 md:mt-0">
          DL Tech Demo – Munich Hacking Legal
        </p>
      </Container>
    </footer>
  )
}

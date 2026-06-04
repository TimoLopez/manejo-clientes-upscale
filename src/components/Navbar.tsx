import Link from 'next/link'

export function Navbar() {
  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold text-lg text-slate-900 tracking-tight">
          Upscale CRM
        </Link>
        <nav className="flex gap-4 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900 transition-colors">Dashboard</Link>
        </nav>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'rgba(10, 8, 22, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
          >
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span
            className="font-bold text-lg tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Upscale CRM
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={pathname === '/' ? { color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.08)' } : {}}
          >
            Dashboard
          </Link>
          <Link
            href="/tasks"
            className="nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={pathname === '/tasks' ? { color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.08)' } : {}}
          >
            <ListTodo className="w-3.5 h-3.5" />
            Tareas
          </Link>
        </nav>
      </div>

      <style>{`
        .nav-link { color: rgba(255,255,255,0.55); }
        .nav-link:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.06); }
      `}</style>
    </header>
  )
}

import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Upscale CRM',
  description: 'Gestión de clientes y tareas para agencias de marketing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${jakarta.className} bg-background text-foreground antialiased min-h-screen`}>
        {/* Background mesh blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div
            className="absolute -top-60 -left-60 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(60px)' }}
          />
          <div
            className="absolute top-1/2 -right-60 w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #0891b2, transparent 70%)', filter: 'blur(60px)' }}
          />
          <div
            className="absolute -bottom-60 left-1/3 w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #9333ea, transparent 70%)', filter: 'blur(60px)' }}
          />
        </div>
        <div className="relative z-10">
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Manrope, Azeret_Mono } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const azeretMono = Azeret_Mono({
  subsets: ['latin'],
  variable: '--font-azeret-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Subsrf Canvas',
  description: 'Design-to-code workspace with AI generation and subsurface inspection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${azeretMono.variable}`}>
      <body className="bg-void text-t1 h-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}

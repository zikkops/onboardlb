import type { Metadata } from 'next'
import { Bree_Serif } from 'next/font/google'
import './globals.css'

const breeSerif = Bree_Serif({
  subsets: ['latin'],
  variable: '--font-bree',
  weight: '400',
})

export const metadata: Metadata = {
  title: 'Onboard — Games & Tales',
  description: "Lebanon's biggest board game café. Three branches: Beirut, Zouk, and Broummana.",
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={breeSerif.variable}>
      <body>
        {children}
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter, Ubuntu } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const ubuntu = Ubuntu({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-ubuntu',
})

export const metadata: Metadata = {
    title: 'Subnaudio',
    description: 'Top notch Subnautica audio generator. I\'m not even squidding.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    )
}
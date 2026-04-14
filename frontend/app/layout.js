import './globals.css'

export const metadata = {
  title: 'Telegram Quiz Sender',
  description: 'Control panel for managing Telegram quiz operations',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
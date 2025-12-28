import { useState } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { ChatContainer } from '@/components/chat/chat-container'
import { SVGBenchmarkContainer } from '@/components/benchmark/svg-benchmark-container'

type AppMode = 'chat' | 'benchmark'

function App() {
  const [mode, setMode] = useState<AppMode>('chat')

  return (
    <ThemeProvider defaultTheme="dark" storageKey="chat-app-theme">
      {mode === 'chat' ? (
        <ChatContainer onOpenBenchmark={() => setMode('benchmark')} />
      ) : (
        <SVGBenchmarkContainer onBack={() => setMode('chat')} />
      )}
    </ThemeProvider>
  )
}

export default App

import { ThemeProvider } from '@/components/theme-provider'
import { ChatContainer } from '@/components/chat/chat-container'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="chat-app-theme">
      <ChatContainer />
    </ThemeProvider>
  )
}

export default App

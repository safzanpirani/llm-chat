import { useEffect, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/common'
import { Copy, Check } from 'lucide-react'

interface CodeHighlighterProps {
  content: string
}

export function CodeHighlighter({ content }: CodeHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  useEffect(() => {
    if (!containerRef.current) return
    
    const codeBlocks = containerRef.current.querySelectorAll('pre code')
    codeBlocks.forEach((block) => {
      if (!block.classList.contains('hljs')) {
        hljs.highlightElement(block as HTMLElement)
      }
    })
  }, [content])

  // Parse content for code blocks and render with neo-brutalist styling
  const renderContent = () => {
    // Split by code blocks (```language\ncode```)
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let blockIndex = 0

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index)
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {textBefore}
          </span>
        )
      }

      const language = match[1] || 'plaintext'
      const code = match[2].trim()
      const currentIndex = blockIndex

      parts.push(
        <div key={`code-${match.index}`} className="my-4 relative group">
          <div className="flex items-center justify-between bg-black text-white dark:bg-white dark:text-black border-2 border-black dark:border-white border-b-0 px-3 py-1">
            <span className="text-xs font-black uppercase tracking-wider">
              {language}
            </span>
            <button
              onClick={() => handleCopy(code, currentIndex)}
              className="text-xs font-bold hover:underline flex items-center gap-1 uppercase"
            >
              {copiedIndex === currentIndex ? (
                <>
                  <Check className="h-3 w-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-[#1e1e1e] p-4 border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-x-auto">
            <pre className="m-0">
              <code className={`language-${language} text-sm`}>
                {code}
              </code>
            </pre>
          </div>
        </div>
      )

      lastIndex = match.index + match[0].length
      blockIndex++
    }

    // Add remaining text after last code block
    if (lastIndex < content.length) {
      const textAfter = content.slice(lastIndex)
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {textAfter}
        </span>
      )
    }

    return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>
  }

  return (
    <div ref={containerRef} className="prose-content">
      {renderContent()}
    </div>
  )
}

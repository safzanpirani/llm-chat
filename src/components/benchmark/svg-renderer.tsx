import { useMemo } from 'react'

interface SVGRendererProps {
  svgContent: string
  className?: string
  showError?: boolean
}

export function SVGRenderer({ svgContent, className = '', showError = true }: SVGRendererProps) {
  const { sanitizedSvg, error } = useMemo(() => {
    if (!svgContent) {
      return { sanitizedSvg: null, error: null }
    }

    const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/i)
    if (!svgMatch) {
      return { sanitizedSvg: null, error: 'No valid SVG found in response' }
    }

    let svg = svgMatch[0]

    svg = svg.replace(/on\w+="[^"]*"/gi, '')
    svg = svg.replace(/javascript:/gi, '')
    svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '')

    if (!svg.includes('xmlns')) {
      svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    }

    if (!svg.includes('viewBox')) {
      const widthMatch = svg.match(/width="(\d+)/)
      const heightMatch = svg.match(/height="(\d+)/)
      const width = widthMatch ? widthMatch[1] : '100'
      const height = heightMatch ? heightMatch[1] : '100'
      svg = svg.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`)
    }

    return { sanitizedSvg: svg, error: null }
  }, [svgContent])

  if (error && showError) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-4 ${className}`}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!sanitizedSvg) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg p-4 ${className}`}>
        <p className="text-sm text-muted-foreground">Waiting for SVG output...</p>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-lg overflow-hidden ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
    />
  )
}

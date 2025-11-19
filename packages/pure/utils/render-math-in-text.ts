import katex from 'katex'

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char)

const MATH_PATTERN = /\\\[(.+?)\\\]|\\\((.+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g

const renderMathSegment = (content: string, displayMode: boolean): string => {
  try {
    return katex.renderToString(content, {
      displayMode,
      throwOnError: false,
      strict: false
    })
  } catch (error) {
    console.warn('[renderMathInText] Failed to render math segment:', error)
    return escapeHtml(content)
  }
}

export const renderMathInText = (text = ''): string => {
  if (!text) return ''

  let lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null

  while ((match = MATH_PATTERN.exec(text)) !== null) {
    const matchIndex = match.index ?? 0
    result += escapeHtml(text.slice(lastIndex, matchIndex))

    const [, bracketDisplay, bracketInline, dollarDisplay, dollarInline] = match

    if (bracketDisplay) {
      result += renderMathSegment(bracketDisplay, true)
    } else if (bracketInline) {
      result += renderMathSegment(bracketInline, false)
    } else if (dollarDisplay) {
      result += renderMathSegment(dollarDisplay, true)
    } else if (dollarInline) {
      result += renderMathSegment(dollarInline, false)
    }

    lastIndex = MATH_PATTERN.lastIndex
  }

  result += escapeHtml(text.slice(lastIndex))

  return result
}

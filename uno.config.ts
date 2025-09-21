import { defineConfig, presetMini, presetTypography, type Rule } from 'unocss'

import { integ } from './src/site.config.ts'

const typographyCustom = integ.typography || {}

// 改进的颜色变量，确保在浅色和深色模式下都有良好对比度
const fg = 'hsl(var(--foreground) / var(--un-text-opacity, 1))'
const fgMuted = 'hsl(var(--muted-foreground) / var(--un-text-opacity, 1))'
const bgMuted = 'hsl(var(--muted) / var(--un-bg-opacity, 1))'
const border = 'hsl(var(--border) / 1)'
const accent = 'hsl(var(--accent) / 1)'

const typographyConfig = {
  cssExtend: {
    // 基础文本颜色确保可读性
    color: fg,
    
    // Title - 增强标题可读性
    'h1,h2,h3,h4,h5,h6': {
      'scroll-margin-top': '3rem',
      'font-weight': '600', // 增加字重提高可读性
      color: fg,
      'line-height': '1.3'
    },
    'h1': {
      'font-size': '2.25rem',
      'font-weight': '700'
    },
    'h2': {
      'font-size': '1.875rem'
    },
    'h3': {
      'font-size': '1.5rem'
    },
    
    // 标题锚点链接
    'h1>a,h2>a,h3>a,h4>a,h5>a,h6>a': {
      'margin-inline-start': '0.75rem',
      color: fgMuted,
      transition: 'all 0.2s ease',
      opacity: '0',
      'text-decoration': 'none'
    },
    'h1>a:focus,h2>a:focus,h3>a:focus,h4>a:focus,h5>a:focus,h6>a:focus': {
      opacity: '1',
      color: accent
    },
    'h1:hover>a,h2:hover>a,h3:hover>a,h4:hover>a,h5:hover>a,h6:hover>a': {
      opacity: '1'
    },
    'h1:target>a,h2:target>a,h3:target>a,h4:target>a,h5:target>a,h6:target>a': {
      opacity: '1',
      color: accent
    },
    
    // 段落文本
    p: {
      color: fg,
      'line-height': '1.7',
      'margin-bottom': '1rem'
    },
    
    // Blockquote - 现代化平面设计
    blockquote: {
      position: 'relative',
      margin: '1.5rem 0',
      padding: '1.25rem 1.5rem',
      'background-color': 'hsl(var(--muted) / 0.3)',
      'border-left': '4px solid hsl(var(--accent) / 1)',
      'border-radius': '0 8px 8px 0',
      color: fg,
      'font-size': '1rem',
      'line-height': '1.6',
      'font-weight': '400',
      ...(typographyCustom.blockquoteStyle === 'normal' && { 'font-style': 'normal' }),
      // 移除阴影和复杂装饰，采用平面设计
      'box-shadow': 'none',
      border: 'none',
      overflow: 'visible'
    },
    'blockquote p': {
      margin: '0',
      color: 'inherit'
    },
    'blockquote p:not(:last-child)': {
      'margin-bottom': '0.75rem'
    },
    // 移除装饰性的引号，保持简洁
    'blockquote::after': {
      content: 'none'
    },
    // 可选：添加简洁的引用标识
    'blockquote::before': {
      content: '""',
      position: 'absolute',
      left: '-2px',
      top: '0',
      bottom: '0',
      width: '4px',
      'background-color': 'hsl(var(--accent) / 1)',
      'border-radius': '2px'
    },

    
    // Table - 改进表格样式
    table: {
      display: 'table',
      width: '100%',
      'font-size': '0.875rem',
      'border-collapse': 'collapse',
      'border-spacing': '0',
      'background-color': 'hsl(var(--card) / 1)',
      'border-radius': 'var(--radius)',
      overflow: 'hidden',
      'box-shadow': `0 1px 3px hsl(var(--muted-foreground) / 0.1)`
    },
    'table tr': {
      'border-bottom': `1px solid ${border}`,
      transition: 'background-color 0.2s ease'
    },
    'table tr:hover': {
      'background-color': bgMuted
    },
    'tbody tr:last-child': {
      'border-bottom-width': '0'
    },
    'thead th': {
      'font-weight': '600',
      color: fg,
      'background-color': bgMuted,
      'text-align': 'left'
    },
    'td, th': {
      border: 'none',
      'text-align': 'start',
      padding: '0.75rem 1rem',
      color: fg
    },
    'thead th:first-child, tbody td:first-child, tfoot td:first-child': {
      'padding-inline-start': '1rem'
    },
    
    // List - 改进列表样式
    'ol, ul': {
      'padding-left': '1.625rem',
      color: fg
    },
    'ol>li, ul>li': {
      'padding-inline-start': '0.375rem',
      color: fg,
      'line-height': '1.6'
    },
    'ul>li::marker': {
      color: accent,
      'font-weight': '600'
    },
    'ol>li::marker': {
      color: accent,
      'font-weight': '600'
    },
    li: {
      'margin-top': '0.5rem',
      'margin-bottom': '0.5rem'
    },
    
    // Inline code - 确保文字可见性
...(typographyCustom.inlineCodeBlockStyle === 'modern' ? {
  ':not(pre) > code': {
    display: 'inline-block',
    padding: '0.125rem 0.375rem',
    margin: '0 0.125rem',
    'background-color': 'hsl(var(--muted) / 0.8)',
    color: 'hsl(var(--foreground) / 1)', // 使用前景色确保可见
    border: '1px solid hsl(var(--border) / 0.5)',
    'border-radius': '4px',
    'font-size': '0.875em',
    'font-weight': '500',
    'font-family': 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    'line-height': '1.4',
    'white-space': 'nowrap',
    'vertical-align': 'baseline',
    // 确保在深色模式下也可见
    '--un-text-opacity': '1'
  },
  ':not(pre)>code::before,:not(pre)>code::after': {
    content: 'none'
  }
} : {
  // 默认样式也要确保可见性
  ':not(pre) > code': {
    color: 'hsl(var(--foreground) / 1)',
    'background-color': 'hsl(var(--muted) / 0.6)',
    padding: '0.125rem 0.25rem',
    'border-radius': '3px',
    'font-weight': '500',
    'font-size': '0.875em',
    '--un-text-opacity': '1'
  }
}),

    
    // Code blocks
    pre: {
      'background-color': 'hsl(var(--card) / 1)',
      border: `1px solid ${border}`,
      'border-radius': 'var(--radius)',
      padding: '1rem',
      overflow: 'auto',
      'font-size': '0.875rem'
    },
    'pre code': {
      color: fg,
      'background-color': 'transparent',
      border: 'none',
      padding: '0'
    },
    
    // Links - 改进链接样式
    a: {
      'word-wrap': 'break-word',
      'word-break': 'break-word',
      'overflow-wrap': 'anywhere',
      'font-weight': '500',
      color: 'hsl(var(--accent-h) var(--accent-s) 70%)',
      'text-decoration': 'underline',
      'text-decoration-color': 'hsl(var(--accent) / 0.3)',
      'text-underline-offset': '2px',
      transition: 'all 0.2s ease'
    },
    'a:hover': {
      color: 'hsl(var(--accent-h) var(--accent-s) 80%)',
      'text-decoration-color': accent
    },
    'a:focus': {
      outline: `2px solid ${accent}`,
      'outline-offset': '2px',
      'border-radius': '2px'
    },
    
    // Images
    img: {
      'border-radius': 'var(--radius)',
      margin: '1rem auto',
      'max-width': '100%',
      height: 'auto',
      'box-shadow': `0 4px 12px hsl(var(--muted-foreground) / 0.1)`
    },
    
    // Horizontal rule
    hr: {
      'border-color': border,
      'border-width': '1px',
      'border-style': 'solid',
      margin: '2rem 0'
    },
    
    // Keyboard keys
    kbd: {
      color: fg,
      'background-color': bgMuted,
      'border': `1px solid ${border}`,
      'border-radius': 'calc(var(--radius) - 2px)',
      padding: '0.125rem 0.375rem',
      'font-size': '0.875em',
      'font-weight': '500',
      'box-shadow': `0 1px 2px hsl(var(--muted-foreground) / 0.2)`
    },
    
    // Strong text
    strong: {
      'font-weight': '700',
      color: fg
    },
    
    // Emphasis
    em: {
      color: fg,
      'font-style': 'italic'
    },
    
    // Code wrapping
    'code:not(pre code)': {
      'white-space': 'pre-wrap',
      'word-break': 'break-all'
    },
    
    // Selection styles
    '::selection': {
      'background-color': 'hsl(var(--accent) / 0.2)',
      color: fg
    },
    '.callout': {
      'border-radius': '6px',
      'border': '1px solid transparent',
      'margin': '16px 0',
      'padding': '0',
      'border-left-width': '4px',
      'overflow': 'hidden'
    },
    
    // Callout 标题样式
    '.callout-title': {
      'font-weight': '600',
      'margin': '0',
      'padding': '12px 16px',
      'font-size': '14px',
      'display': 'flex',
      'align-items': 'center',
      'gap': '8px',
      'border-bottom': '1px solid rgba(0,0,0,0.1)'
    },
    
    // Callout 内容样式 - 关键更新
    '.callout-content': {
      'padding': '12px 16px',
      'margin': '0',
      // 继承父级的背景色，但透明度更低
      'background-color': 'inherit',
      'opacity': '0.7'
    },
    
    // 为不同类型的 callout 设置统一背景
    '.callout.note': {
      'background-color': '#3b82f61a',
      'border-left-color': '#3b82f6'
    },
    
    '.callout.tip': {
      'background-color': '#22c55e1a',
      'border-left-color': '#22c55e'
    },
    
    '.callout.important': {
      'background-color': '#8b5cf61a',
      'border-left-color': '#8b5cf6'
    },
    
    '.callout.warning': {
      'background-color': '#f59e0b1a',
      'border-left-color': '#f59e0b'
    },
    
    '.callout.caution': {
      'background-color': '#ef44441a',
      'border-left-color': '#ef4444'
    },
    
    '.callout.example': {
      'background-color': '#7c4dff1a',
      'border-left-color': '#7c4dff'
    },
    
    // 确保内容文字颜色正确
    '.callout-content *': {
      'color': 'inherit'
    },
    
    '.callout-content ul, .callout-content ol': {
      'margin': '8px 0',
      'padding-left': '20px'
    },
    
    '.callout-content li': {
      'margin': '4px 0'
    },
    
    '.callout-content p': {
      'margin': '8px 0'
    },
    
    '.callout-content p:first-child': {
      'margin-top': '0'
    },
    
    '.callout-content p:last-child': {
      'margin-bottom': '0'
    },
    
    // 移除 title 的 border-bottom，因为整个区域都有背景色了
    '.callout .callout-title': {
      'border-bottom': 'none'
    },
    
    // 深色模式适配
    '@media (prefers-color-scheme: dark)': {
      '.callout.note': {
        'background-color': '#3b82f620',
        'color': '#93c5fd'
      },
      
      '.callout.tip': {
        'background-color': '#22c55e20',
        'color': '#86efac'
      },
      
      '.callout.important': {
        'background-color': '#8b5cf620',
        'color': '#c4b5fd'
      },
      
      '.callout.warning': {
        'background-color': '#f59e0b20',
        'color': '#fcd34d'
      },
      
      '.callout.caution': {
        'background-color': '#ef444420',
        'color': '#fca5a5'
      },
      
      '.callout.example': {
        'background-color': '#7c4dff20',
        'color': '#c4b5fd'
      }
    },
    '.card-fade-image': {
      'position': 'relative',
      'overflow': 'hidden'
    },
    
    '.card-fade-image::after': {
      'content': '""',
      'position': 'absolute',
      'right': '0',
      'top': '0',
      'bottom': '0',
      'width': '40%',
      'background-image': 'var(--bg-image)', // 关键：使用CSS变量
      'background-size': 'cover',
      'background-position': 'center',
      'background-repeat': 'no-repeat',
      'mask': 'linear-gradient(to left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
      '-webkit-mask': 'linear-gradient(to left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
      'z-index': '1'
    },
    
    '.card-fade-image > *': {
      'position': 'relative',
      'z-index': '2'
    }
  } as const
}

// 扩展主题颜色，确保更好的对比度
const themeColors = {
  border: 'hsl(var(--border) / <alpha-value>)',
  input: 'hsl(var(--input) / <alpha-value>)',
  ring: 'hsl(var(--ring) / <alpha-value>)',
  background: 'hsl(var(--background) / <alpha-value>)',
  foreground: 'hsl(var(--foreground) / <alpha-value>)',
  primary: {
    DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
    foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
  },
  secondary: {
    DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
    foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
  },
  destructive: {
    DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
    foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
  },
  muted: {
    DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
    foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
  },
  accent: {
    DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
    foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
  },
  popover: {
    DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
    foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
  },
  card: {
    DEFAULT: 'hsl(var(--card) / <alpha-value>)',
    foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
  }
}

// 增强的规则
const rules: Rule<object>[] = [
  // 可访问性相关
  [
    'sr-only',
    {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      'white-space': 'nowrap',
      'border-width': '0'
    }
  ],
  [
    'object-cover',
    {
      'object-fit': 'cover'
    }
  ],
  [
    'bg-cover',
    {
      'background-size': 'cover'
    }
  ],
  // 焦点样式
  [
    'focus-visible',
    {
      outline: '2px solid hsl(var(--ring))',
      'outline-offset': '2px'
    }
  ]
]

export default defineConfig({
  presets: [
    presetMini(),
    presetTypography(typographyConfig)
  ],
  rules,
  theme: {
    colors: themeColors,
    // 添加断点以确保响应式设计
    breakpoints: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    }
  },
  safelist: [
    // TOC
    'rounded-t-2xl',
    'rounded-b-2xl',
    // Typography
    'text-base',
    'prose',
    // 可访问性
    'focus-visible',
    'sr-only'
  ]
})

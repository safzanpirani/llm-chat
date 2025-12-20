export const MODELS = {
  'gemini-claude-sonnet-4-5': { 
    provider: 'anthropic' as const, 
    name: 'Claude Sonnet 4.5' 
  },
  'gemini-claude-sonnet-4-5-thinking': { 
    provider: 'anthropic' as const, 
    name: 'Claude Sonnet 4.5 Thinking' 
  },
  'gemini-claude-opus-4-5-thinking': { 
    provider: 'anthropic' as const, 
    name: 'Claude Opus 4.5 Thinking' 
  },
  'gpt-oss-120b-medium': { 
    provider: 'google' as const, 
    name: 'GPT OSS 120B Medium' 
  },
  'gemini-2.5-flash-lite': { 
    provider: 'google' as const, 
    name: 'Gemini 2.5 Flash Lite' 
  },
  'gemini-3-pro-preview': { 
    provider: 'google' as const, 
    name: 'Gemini 3 Pro Preview' 
  },
  'gemini-3-flash': { 
    provider: 'google' as const, 
    name: 'Gemini 3 Flash' 
  },
  'gemini-2.5-computer-use-preview-10-2025': { 
    provider: 'google' as const, 
    name: 'Gemini 2.5 Computer Use' 
  },
  'gemini-3-pro-image-preview': { 
    provider: 'google' as const, 
    name: 'Gemini 3 Pro Image' 
  },
  'gemini-2.5-flash': { 
    provider: 'google' as const, 
    name: 'Gemini 2.5 Flash' 
  },
} as const

export type ModelId = keyof typeof MODELS

export const MODEL_LIST = Object.entries(MODELS).map(([id, config]) => ({
  id: id as ModelId,
  ...config,
}))

export const DEFAULT_MODEL: ModelId = 'gemini-2.5-flash'

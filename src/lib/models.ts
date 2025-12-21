// Pricing per million tokens (USD)
export interface ModelConfig {
  provider: 'anthropic' | 'google'
  name: string
  maxContext: number // Maximum context window in tokens
  inputPrice: number // $ per 1M input tokens
  outputPrice: number // $ per 1M output tokens
  cacheReadPrice?: number // $ per 1M cached input tokens (if supported)
  cacheWritePrice?: number // $ per 1M tokens written to cache
}

export const MODELS: Record<string, ModelConfig> = {
  'gemini-claude-sonnet-4-5': {
    provider: 'anthropic',
    name: 'Claude Sonnet 4.5',
    maxContext: 200000,
    inputPrice: 3.00,
    outputPrice: 15.00,
    cacheReadPrice: 0.30,
    cacheWritePrice: 3.75,
  },
  'gemini-claude-sonnet-4-5-thinking': {
    provider: 'anthropic',
    name: 'Claude Sonnet 4.5 Thinking',
    maxContext: 200000,
    inputPrice: 3.00,
    outputPrice: 15.00,
    cacheReadPrice: 0.30,
    cacheWritePrice: 3.75,
  },
  'gemini-claude-opus-4-5-thinking': {
    provider: 'anthropic',
    name: 'Claude Opus 4.5 Thinking',
    maxContext: 200000,
    inputPrice: 5.00,
    outputPrice: 25.00,
    cacheReadPrice: 0.50,
    cacheWritePrice: 6.25,
  },
  'gpt-oss-120b-medium': {
    provider: 'google',
    name: 'GPT OSS 120B Medium',
    maxContext: 128000,
    inputPrice: 1.25,
    outputPrice: 5.00,
  },
  'gemini-2.5-flash-lite': {
    provider: 'google',
    name: 'Gemini 2.5 Flash Lite',
    maxContext: 1000000,
    inputPrice: 0.075,
    outputPrice: 0.30,
  },
  'gemini-3-pro-preview': {
    provider: 'google',
    name: 'Gemini 3 Pro Preview',
    maxContext: 1000000,
    inputPrice: 2.00,
    outputPrice: 12.00,
  },
  'gemini-3-flash': {
    provider: 'google',
    name: 'Gemini 3 Flash',
    maxContext: 1000000,
    inputPrice: 0.50,
    outputPrice: 3.00,
  },
  'gemini-2.5-computer-use-preview-10-2025': {
    provider: 'google',
    name: 'Gemini 2.5 Computer Use',
    maxContext: 1000000,
    inputPrice: 0.15,
    outputPrice: 0.60,
  },
  'gemini-3-pro-image-preview': {
    provider: 'google',
    name: 'Gemini 3 Pro Image',
    maxContext: 1000000,
    inputPrice: 1.25,
    outputPrice: 10.00,
  },
  'gemini-2.5-flash': {
    provider: 'google',
    name: 'Gemini 2.5 Flash',
    maxContext: 1000000,
    inputPrice: 0.30,
    outputPrice: 2.50,
    cacheReadPrice: 0.075,
    cacheWritePrice: 0.30,
  },
}

export type ModelId = keyof typeof MODELS

export const MODEL_LIST = Object.entries(MODELS).map(([id, config]) => ({
  id: id as ModelId,
  ...config,
}))

export const DEFAULT_MODEL: ModelId = 'gemini-2.5-flash'

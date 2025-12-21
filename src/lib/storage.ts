export type VariationCount = 1 | 2 | 3 | 4

export interface SessionMeta {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  model: string
  variationCount?: VariationCount
}

export interface GeneratedImage {
  mimeType: string
  data: string
  prompt?: string
  aspectRatio?: string
  resolution?: string
  generationTimeMs?: number
  thoughtSignature?: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  totalTokens: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string
  generatedImages?: GeneratedImage[]
  createdAt: string
  model?: string
  attachments?: Array<{
    type: 'image' | 'document'
    name: string
    data: string
    mimeType: string
  }>
  siblings?: Message[]
  activeSiblingIndex?: number
  usage?: TokenUsage
  // Variation support: multiple parallel responses
  variations?: Message[]
  activeVariationIndex?: number
}

export interface Session extends SessionMeta {
  messages: Message[]
}

export async function getSessions(): Promise<SessionMeta[]> {
  const res = await fetch('/api/sessions')
  if (!res.ok) throw new Error('Failed to fetch sessions')
  return res.json()
}

export async function createSession(title?: string, model?: string): Promise<SessionMeta> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, model }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json()
}

export async function getSession(id: string): Promise<Session> {
  const res = await fetch(`/api/session/${id}`)
  if (!res.ok) throw new Error('Failed to fetch session')
  return res.json()
}

export async function updateSession(id: string, data: Partial<Session>): Promise<Session> {
  const res = await fetch(`/api/session/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update session')
  return res.json()
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/session/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete session')
}

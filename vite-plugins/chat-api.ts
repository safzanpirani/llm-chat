import type { Plugin, Connect } from 'vite'

const ANTHROPIC_BASE_URL = 'http://localhost:8317/v1'
const GOOGLE_BASE_URL = 'http://localhost:8317/v1beta'

const CLAUDE_MODELS = [
  'gemini-claude-sonnet-4-5',
  'gemini-claude-sonnet-4-5-thinking',
  'gemini-claude-opus-4-5-thinking',
]

const CLAUDE_THINKING_MODELS = [
  'gemini-claude-sonnet-4-5-thinking',
  'gemini-claude-opus-4-5-thinking',
]

const IMAGE_GENERATION_MODELS = [
  'gemini-3-pro-image-preview',
]

function parseBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

interface Attachment {
  type: 'image' | 'document'
  name: string
  data: string
  mimeType: string
}

interface GeneratedImage {
  mimeType: string
  data: string
}

interface ChatMessage {
  role: string
  content: string
  attachments?: Attachment[]
  generatedImages?: GeneratedImage[]
}

interface ImageConfig {
  aspectRatio?: string
  resolution?: string
}

function convertToGoogleFormat(
  messages: ChatMessage[], 
  enableThinking: boolean, 
  enableImageGeneration: boolean,
  imageConfig?: ImageConfig
) {
  const systemInstruction = messages.find(m => m.role === 'system')
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []
      
      if (m.attachments) {
        for (const att of m.attachments) {
          if (att.type === 'image' && att.data) {
            const base64Match = att.data.match(/^data:([^;]+);base64,(.+)$/)
            if (base64Match) {
              parts.push({
                inlineData: {
                  mimeType: base64Match[1],
                  data: base64Match[2],
                },
              })
            }
          }
        }
      }
      
      if (m.generatedImages && m.role === 'assistant') {
        for (const img of m.generatedImages) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          })
        }
      }
      
      if (m.content) {
        parts.push({ text: m.content })
      }
      
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      }
    })

  return {
    contents,
    ...(systemInstruction && {
      systemInstruction: { parts: [{ text: systemInstruction.content }] },
    }),
    generationConfig: {
      maxOutputTokens: 8192,
      ...(enableThinking && {
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 10000,
        },
      }),
      ...(enableImageGeneration && {
        responseModalities: ['TEXT', 'IMAGE'],
        ...(imageConfig && {
          imageConfig: {
            aspectRatio: imageConfig.aspectRatio || '1:1',
            imageSize: imageConfig.resolution || '1K',
          },
        }),
      }),
    },
  }
}

function convertGoogleSSEToOpenAI(chunk: string): string {
  const lines = chunk.split('\n')
  const results: string[] = []

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)
      const parts = parsed.candidates?.[0]?.content?.parts || []
      
      for (const part of parts) {
        if (part.thought === true && part.text) {
          results.push(`data: ${JSON.stringify({
            choices: [{ delta: { thinking: part.text } }],
          })}\n\n`)
        } else if (part.text && part.thought !== true) {
          results.push(`data: ${JSON.stringify({
            choices: [{ delta: { content: part.text } }],
          })}\n\n`)
        } else if (part.inlineData && part.thought !== true) {
          const mimeType = part.inlineData.mimeType || 'image/png'
          const base64Data = part.inlineData.data
          results.push(`data: ${JSON.stringify({
            choices: [{ delta: { image: { mimeType, data: base64Data } } }],
          })}\n\n`)
        }
      }
    } catch {
      // Partial JSON, skip
    }
  }

  return results.join('')
}

function convertClaudeSSEToOpenAI(chunk: string): string {
  const lines = chunk.split('\n')
  const results: string[] = []

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)
      
      if (parsed.type === 'content_block_delta') {
        if (parsed.delta?.type === 'thinking_delta' && parsed.delta?.thinking) {
          results.push(`data: ${JSON.stringify({
            choices: [{ delta: { thinking: parsed.delta.thinking } }],
          })}\n\n`)
        } else if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
          results.push(`data: ${JSON.stringify({
            choices: [{ delta: { content: parsed.delta.text } }],
          })}\n\n`)
        }
      }
    } catch {
      // Partial JSON, skip
    }
  }

  return results.join('')
}

export function chatApiPlugin(): Plugin {
  return {
    name: 'chat-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        const method = req.method || 'GET'

        if (url === '/api/chat' && method === 'POST') {
          try {
            const bodyStr = await parseBody(req)
            const body = JSON.parse(bodyStr)
            const model = body.model || 'gemini-2.5-flash'
            const messages: ChatMessage[] = body.messages || []
            
            const isClaudeModel = CLAUDE_MODELS.includes(model)
            const isClaudeThinkingModel = CLAUDE_THINKING_MODELS.includes(model)
            const isImageModel = IMAGE_GENERATION_MODELS.includes(model)

            let endpoint: string
            let headers: Record<string, string>
            let requestBody: Record<string, unknown>

            if (isClaudeModel) {
              endpoint = `${ANTHROPIC_BASE_URL}/messages`
              headers = {
                'Content-Type': 'application/json',
                'x-api-key': 'sk-ant-dummy-key-for-proxy-usage',
                'anthropic-version': '2023-06-01',
              }

              const systemMessage = messages.find(m => m.role === 'system')
              const nonSystemMessages = messages.filter(m => m.role !== 'system')
              
              requestBody = {
                model,
                max_tokens: body.max_tokens || 16000,
                stream: true,
                messages: nonSystemMessages.map(m => {
                  const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = []
                  
                  if (m.attachments) {
                    for (const att of m.attachments) {
                      if (att.type === 'image' && att.data) {
                        const base64Match = att.data.match(/^data:([^;]+);base64,(.+)$/)
                        if (base64Match) {
                          content.push({
                            type: 'image',
                            source: {
                              type: 'base64',
                              media_type: base64Match[1],
                              data: base64Match[2],
                            },
                          })
                        }
                      }
                    }
                  }
                  
                  if (m.content) {
                    content.push({ type: 'text', text: m.content })
                  }
                  
                  return {
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: content.length === 1 && content[0].type === 'text' ? m.content : content,
                  }
                }),
                ...(systemMessage && { system: systemMessage.content }),
                ...(isClaudeThinkingModel && {
                  thinking: {
                    type: 'enabled',
                    budget_tokens: 10000,
                  },
                }),
              }
            } else {
              const enableThinking = model.includes('2.5') || model.includes('3-pro')
              const imageConfig: ImageConfig | undefined = body.imageConfig
              
              if (isImageModel) {
                endpoint = `${GOOGLE_BASE_URL}/models/${model}:generateContent`
              } else {
                endpoint = `${GOOGLE_BASE_URL}/models/${model}:streamGenerateContent?alt=sse`
              }
              
              headers = {
                'Content-Type': 'application/json',
                'x-goog-api-key': 'dummy-google-api-key-for-proxy-usage',
              }

              requestBody = convertToGoogleFormat(messages, enableThinking, isImageModel, imageConfig)
            }

            const upstreamRes = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody),
            })

            if (!upstreamRes.ok) {
              const errorText = await upstreamRes.text()
              console.error('Upstream error:', upstreamRes.status, errorText)
              res.statusCode = upstreamRes.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: errorText }))
              return
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')

            if (isImageModel && !isClaudeModel) {
              const jsonResponse = await upstreamRes.json() as { candidates?: Array<{ content?: { parts?: Array<{ thought?: boolean; text?: string; inlineData?: { mimeType: string; data: string } }> } }> }
              const parts = jsonResponse.candidates?.[0]?.content?.parts || []
              
              for (const part of parts) {
                if (part.thought === true && part.text) {
                  res.write(`data: ${JSON.stringify({
                    choices: [{ delta: { thinking: part.text } }],
                  })}\n\n`)
                } else if (part.text && part.thought !== true) {
                  res.write(`data: ${JSON.stringify({
                    choices: [{ delta: { content: part.text } }],
                  })}\n\n`)
                } else if (part.inlineData) {
                  res.write(`data: ${JSON.stringify({
                    choices: [{ delta: { image: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } } }],
                  })}\n\n`)
                }
              }
              
              res.write('data: [DONE]\n\n')
              res.end()
              return
            }

            const reader = upstreamRes.body?.getReader()
            if (!reader) {
              res.end()
              return
            }

            const decoder = new TextDecoder()
            
            const processStream = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  const chunk = decoder.decode(value, { stream: true })
                  
                  if (isClaudeModel) {
                    const converted = convertClaudeSSEToOpenAI(chunk)
                    if (converted) {
                      res.write(converted)
                    }
                  } else {
                    const converted = convertGoogleSSEToOpenAI(chunk)
                    if (converted) {
                      res.write(converted)
                    }
                  }
                }
                res.write('data: [DONE]\n\n')
              } finally {
                res.end()
              }
            }

            processStream()
            return
          } catch (error) {
            console.error('Chat API error:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Internal server error' }))
            return
          }
        }

        next()
      })
    },
  }
}

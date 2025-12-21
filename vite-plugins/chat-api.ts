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
  thoughtSignature?: string
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
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string }; thought_signature?: string }> = []
      
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
          const imagePart: { inlineData: { mimeType: string; data: string }; thought_signature?: string } = {
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          }
          if (img.thoughtSignature) {
            imagePart.thought_signature = img.thoughtSignature
          }
          parts.push(imagePart)
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

interface UsageData {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  totalTokens: number
}

interface ConvertResult {
  content: string
  usage?: UsageData
}

function convertGoogleSSEToOpenAI(chunk: string): ConvertResult {
  const lines = chunk.split('\n')
  const results: string[] = []
  let usage: UsageData | undefined

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)
      const parts = parsed.candidates?.[0]?.content?.parts || []
      
      if (parsed.usageMetadata) {
        const u = parsed.usageMetadata
        console.log('[Gemini usage] usageMetadata:', JSON.stringify(u))
        const thinkingTokens = u.thoughtsTokenCount || 0
        usage = {
          inputTokens: u.promptTokenCount || 0,
          outputTokens: (u.candidatesTokenCount || 0) + thinkingTokens,
          cacheReadTokens: u.cachedContentTokenCount || undefined,
          totalTokens: u.totalTokenCount || 0,
        }
      }
      
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

  return { content: results.join(''), usage }
}

function convertClaudeSSEToOpenAI(chunk: string): ConvertResult {
  const lines = chunk.split('\n')
  const results: string[] = []
  let usage: UsageData | undefined

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)
      
      // message_start contains input tokens
      if (parsed.type === 'message_start' && parsed.message?.usage) {
        const u = parsed.message.usage
        console.log('[Claude usage] message_start:', JSON.stringify(u))
        usage = {
          inputTokens: u.input_tokens || 0,
          outputTokens: u.output_tokens || 0,
          cacheReadTokens: u.cache_read_input_tokens || undefined,
          cacheWriteTokens: u.cache_creation_input_tokens || undefined,
          totalTokens: (u.input_tokens || 0) + (u.output_tokens || 0),
        }
      }
      
      // message_delta contains final output tokens (and input tokens from this proxy)
      if (parsed.type === 'message_delta' && parsed.usage) {
        const u = parsed.usage
        console.log('[Claude usage] message_delta:', JSON.stringify(u))
        usage = {
          inputTokens: u.input_tokens || usage?.inputTokens || 0,
          outputTokens: u.output_tokens || 0,
          cacheReadTokens: u.cache_read_input_tokens || usage?.cacheReadTokens,
          cacheWriteTokens: u.cache_creation_input_tokens || usage?.cacheWriteTokens,
          totalTokens: (u.input_tokens || usage?.inputTokens || 0) + (u.output_tokens || 0),
        }
      }
      
      // Fallback: capture usage from any event that has it at top level
      if (parsed.usage && !usage) {
        const u = parsed.usage
        console.log('[Claude usage] fallback:', JSON.stringify(u))
        usage = {
          inputTokens: u.input_tokens || u.inputTokens || 0,
          outputTokens: u.output_tokens || u.outputTokens || 0,
          cacheReadTokens: u.cache_read_input_tokens || u.cacheReadTokens || undefined,
          cacheWriteTokens: u.cache_creation_input_tokens || u.cacheWriteTokens || undefined,
          totalTokens: (u.input_tokens || u.inputTokens || 0) + (u.output_tokens || u.outputTokens || 0),
        }
      }
      
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

  return { content: results.join(''), usage }
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

            const requestStartTime = Date.now()
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
              console.log('Image generation request - messages count:', messages.length)
              console.log('Messages with images:', messages.filter(m => m.generatedImages?.length).length)
              
              const jsonResponse = await upstreamRes.json() as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }; error?: { message: string } }
              const generationTimeMs = Date.now() - requestStartTime
              
              // Debug: log full upstream response
              console.log('Image generation upstream response:', JSON.stringify(jsonResponse, null, 2))
              
              if (jsonResponse.error) {
                console.error('Image API error:', jsonResponse.error)
                res.write(`data: ${JSON.stringify({ error: jsonResponse.error })}\n\n`)
                res.write('data: [DONE]\n\n')
                res.end()
                return
              }
              
              const parts = jsonResponse.candidates?.[0]?.content?.parts || []
              const lastUserMessage = messages.filter(m => m.role === 'user').pop()
              const prompt = lastUserMessage?.content || ''
              const imageConfig: ImageConfig | undefined = body.imageConfig
              
              let imageEmitted = false
              for (const part of parts) {
                const thought = part.thought as boolean | undefined
                const text = part.text as string | undefined
                const inlineData = part.inlineData as { mimeType: string; data: string } | undefined
                const signature = (part.thoughtSignature || part.thought_signature) as string | undefined
                
                if (thought === true && text) {
                  res.write(`data: ${JSON.stringify({
                    choices: [{ delta: { thinking: text } }],
                  })}\n\n`)
                } else if (text && thought !== true) {
                  res.write(`data: ${JSON.stringify({
                    choices: [{ delta: { content: text } }],
                  })}\n\n`)
                } else if (inlineData && !imageEmitted) {
                  imageEmitted = true
                  res.write(`data: ${JSON.stringify({
                    choices: [{ delta: { image: { 
                      mimeType: inlineData.mimeType, 
                      data: inlineData.data,
                      prompt,
                      aspectRatio: imageConfig?.aspectRatio || '1:1',
                      resolution: imageConfig?.resolution || '1K',
                      generationTimeMs,
                      thoughtSignature: signature,
                    } } }],
                  })}\n\n`)
                }
              }
              
              if (jsonResponse.usageMetadata) {
                const u = jsonResponse.usageMetadata
                res.write(`data: ${JSON.stringify({ usage: {
                  inputTokens: u.promptTokenCount || 0,
                  outputTokens: u.candidatesTokenCount || 0,
                  totalTokens: u.totalTokenCount || 0,
                } })}\n\n`)
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
            let accumulatedUsage: UsageData | undefined
            
            const processStream = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  const chunk = decoder.decode(value, { stream: true })
                  
                  if (isClaudeModel) {
                    const { content: converted, usage } = convertClaudeSSEToOpenAI(chunk)
                    if (usage) {
                      accumulatedUsage = {
                        inputTokens: usage.inputTokens || accumulatedUsage?.inputTokens || 0,
                        outputTokens: usage.outputTokens || accumulatedUsage?.outputTokens || 0,
                        cacheReadTokens: usage.cacheReadTokens ?? accumulatedUsage?.cacheReadTokens,
                        cacheWriteTokens: usage.cacheWriteTokens ?? accumulatedUsage?.cacheWriteTokens,
                        totalTokens: (usage.inputTokens || accumulatedUsage?.inputTokens || 0) + (usage.outputTokens || accumulatedUsage?.outputTokens || 0),
                      }
                    }
                    if (converted) {
                      res.write(converted)
                    }
                  } else {
                    const { content: converted, usage } = convertGoogleSSEToOpenAI(chunk)
                    if (usage) {
                      accumulatedUsage = usage
                    }
                    if (converted) {
                      res.write(converted)
                    }
                  }
                }
                if (accumulatedUsage) {
                  res.write(`data: ${JSON.stringify({ usage: accumulatedUsage })}\n\n`)
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

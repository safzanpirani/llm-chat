import type { Plugin, Connect } from 'vite'
import type { ServerResponse } from 'http'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions')
const IMAGES_DIR = path.join(DATA_DIR, 'images')

function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true })
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]')
}

function parseBody(req: Connect.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function storageApiPlugin(): Plugin {
  return {
    name: 'storage-api-plugin',
    configureServer(server) {
      ensureDataDirs()

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        const method = req.method || 'GET'

        if (url === '/api/sessions' && method === 'GET') {
          const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
          return sendJson(res, sessions)
        }

        if (url === '/api/sessions' && method === 'POST') {
          const body = await parseBody(req)
          const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
          const newSession = {
            id: randomUUID(),
            title: body.title || 'New Chat',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            model: body.model || 'gemini-2.5-flash',
          }
          sessions.unshift(newSession)
          fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
          fs.writeFileSync(
            path.join(SESSIONS_DIR, `${newSession.id}.json`),
            JSON.stringify({ ...newSession, messages: [] }, null, 2)
          )
          return sendJson(res, newSession, 201)
        }

        const sessionMatch = url.match(/^\/api\/session\/([^/]+)$/)
        if (sessionMatch) {
          const sessionId = sessionMatch[1]
          const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`)

          if (method === 'GET') {
            if (!fs.existsSync(sessionFile)) {
              return sendJson(res, { error: 'Session not found' }, 404)
            }
            const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'))
            return sendJson(res, session)
          }

          if (method === 'POST') {
            const body = await parseBody(req)
            const session = fs.existsSync(sessionFile)
              ? JSON.parse(fs.readFileSync(sessionFile, 'utf-8'))
              : { id: sessionId, messages: [] }
            
            const updated = {
              ...session,
              ...body,
              updatedAt: new Date().toISOString(),
            }
            fs.writeFileSync(sessionFile, JSON.stringify(updated, null, 2))

            const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
            const idx = sessions.findIndex((s: { id: string }) => s.id === sessionId)
            if (idx !== -1) {
              sessions[idx] = { 
                ...sessions[idx], 
                title: updated.title || sessions[idx].title,
                updatedAt: updated.updatedAt,
                model: updated.model || sessions[idx].model,
              }
              fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
            }

            return sendJson(res, updated)
          }

          if (method === 'DELETE') {
            if (fs.existsSync(sessionFile)) {
              fs.unlinkSync(sessionFile)
            }
            const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'))
            const filtered = sessions.filter((s: { id: string }) => s.id !== sessionId)
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify(filtered, null, 2))
            return sendJson(res, { success: true })
          }
        }

        if (url === '/api/images' && method === 'POST') {
          const body = await parseBody(req)
          const dataUrl = body.dataUrl as string
          if (!dataUrl) {
            return sendJson(res, { error: 'Missing dataUrl' }, 400)
          }
          const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
          if (!matches) {
            return sendJson(res, { error: 'Invalid dataUrl format' }, 400)
          }
          const id = randomUUID()
          const buffer = Buffer.from(matches[2], 'base64')
          const imagePath = path.join(IMAGES_DIR, `${id}.webp`)
          fs.writeFileSync(imagePath, buffer)
          return sendJson(res, { id, url: `/api/images/${id}` }, 201)
        }

        const imageMatch = url.match(/^\/api\/images\/([^/]+)$/)
        if (imageMatch && method === 'GET') {
          const imageId = imageMatch[1]
          const imagePath = path.join(IMAGES_DIR, `${imageId}.webp`)
          if (!fs.existsSync(imagePath)) {
            return sendJson(res, { error: 'Image not found' }, 404)
          }
          res.setHeader('Content-Type', 'image/webp')
          res.setHeader('Cache-Control', 'public, max-age=31536000')
          fs.createReadStream(imagePath).pipe(res)
          return
        }

        next()
      })
    },
  }
}

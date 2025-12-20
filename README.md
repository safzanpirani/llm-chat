# LLM Chat

Self-hosted chat application with multi-model LLM support. Proxies to local LLM APIs at `localhost:8317`.

## Features

- **Multi-model support**: Claude (Anthropic API) and Gemini (Google API) models
- **Image generation**: Gemini 3 Pro Image with aspect ratio and resolution controls
- **Streaming responses**: Real-time token streaming with thinking/reasoning display
- **File attachments**: Upload images via button, paste, or drag-and-drop
- **Session management**: Create, switch, and delete chat sessions
- **Message editing**: Edit any message to regenerate from that point
- **Dark/light theme**: Toggle between themes
- **LAN accessible**: Access from other devices on the network

## Models

| Model | Provider | Features |
|-------|----------|----------|
| Gemini 2.5 Flash | Google | Default, fast |
| Gemini 2.5 Flash Lite | Google | Lightweight |
| Gemini 3 Flash | Google | Latest |
| Gemini 3 Pro Preview | Google | Thinking |
| Gemini 3 Pro Image | Google | Image generation |
| Claude Sonnet 4.5 | Anthropic | |
| Claude Sonnet 4.5 Thinking | Anthropic | Extended thinking |
| Claude Opus 4.5 Thinking | Anthropic | Extended thinking |

## Setup

```bash
npm install
npm run dev
```

Access at `http://localhost:5173` or `http://<your-ip>:5173` from other devices.

## Requirements

- Node.js 18+
- Local LLM proxy running at `localhost:8317`
  - Claude models: `/v1/messages` (Anthropic API format)
  - Gemini models: `/v1beta/models/{model}:streamGenerateContent` (Google API format)

## Tech Stack

- React 19 + Vite 7 + TypeScript
- Tailwind CSS v4
- shadcn/ui components
- streamdown for markdown rendering

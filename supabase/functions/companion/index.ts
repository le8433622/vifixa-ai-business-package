// Companion Edge Function dispatcher
// Routes to chat and memory handlers

import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const path = url.pathname

  try {
    if (path.includes('/chat')) {
      return (await import('./chat/index.ts')).handler(req)
    }
    if (path.includes('/memory')) {
      return (await import('./memory/index.ts')).handler(req)
    }

    return jsonResponse({ error: 'companion action not found' }, 404)
  } catch (err: any) {
    console.error('[VIFIXA] companion dispatcher:', err)
    return jsonResponse({ error: err.message }, 500)
  }
})

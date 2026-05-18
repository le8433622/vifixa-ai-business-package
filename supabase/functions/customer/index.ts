// Customer Edge Function dispatcher
// Routes to actions handler

import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const path = url.pathname

  try {
    if (path.includes('/actions')) {
      return (await import('./actions/index.ts')).handler(req)
    }

    return jsonResponse({ error: 'customer action not found' }, 404)
  } catch (err: any) {
    console.error('[VIFIXA] customer dispatcher:', err)
    return jsonResponse({ error: err.message }, 500)
  }
})

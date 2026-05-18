// Worker Edge Function dispatcher
// Routes to job-actions handler

import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const path = url.pathname

  try {
    if (path.includes('/job-actions')) {
      return (await import('./job-actions/index.ts')).handler(req)
    }

    return jsonResponse({ error: 'worker action not found' }, 404)
  } catch (err: any) {
    console.error('[VIFIXA] worker dispatcher:', err)
    return jsonResponse({ error: err.message }, 500)
  }
})

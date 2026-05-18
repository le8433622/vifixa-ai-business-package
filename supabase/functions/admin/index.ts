// Admin Edge Function dispatcher
// Routes to admin-actions and user-actions handlers

import { jsonResponse, handleOptions } from '../_shared/auth-helper.ts'

Deno.serve(async (req: Request) => {
  const opt = handleOptions(req)
  if (opt) return opt

  const url = new URL(req.url)
  const path = url.pathname

  try {
    if (path.includes('/admin-actions')) {
      return (await import('./admin-actions/index.ts')).handler(req)
    }
    if (path.includes('/user-actions')) {
      return (await import('./user-actions/index.ts')).handler(req)
    }

    return jsonResponse({ error: 'admin action not found' }, 404)
  } catch (err: any) {
    console.error('[VIFIXA] admin dispatcher:', err)
    return jsonResponse({ error: err.message }, 500)
  }
})

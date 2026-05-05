/**
 * Short-lived in-memory GET response cache (Redis-compatible pattern: replace store with Redis later).
 * Intercepts res.json for successful JSON payloads only.
 */
function createJsonResponseCache({ ttlMs = 20_000, maxEntries = 400 } = {}) {
  const store = new Map()

  function prune() {
    if (store.size <= maxEntries) return
    const overflow = store.size - maxEntries
    const keys = store.keys()
    for (let i = 0; i < overflow; i += 1) {
      const next = keys.next()
      if (next.done) break
      store.delete(next.value)
    }
  }

  return function jsonResponseCache(keyFn) {
    return (req, res, next) => {
      if (req.method !== 'GET') {
        return next()
      }

      const key = keyFn(req)
      if (!key || typeof key !== 'string') {
        return next()
      }

      const hit = store.get(key)
      if (hit && hit.expiresAt > Date.now()) {
        return res.status(200).json(hit.body)
      }

      const originalJson = res.json.bind(res)
      res.json = (body) => {
        const statusCode = res.statusCode || 200
        if (statusCode >= 200 && statusCode < 300) {
          try {
            store.set(key, { expiresAt: Date.now() + ttlMs, body })
            prune()
          } catch {
            // ignore cache write failures
          }
        }
        return originalJson(body)
      }

      return next()
    }
  }
}

module.exports = { createJsonResponseCache }

/**
 * Drops remote URLs that are typically decorative stock/CDN hosts so the browser
 * never opens long image dependency chains for non-essential media.
 *
 * Same-origin relative paths, blob:, and data: URLs are kept (uploads / previews).
 */
const BLOCKED_HOST_SUFFIXES = [
  'pexels.com',
  'unsplash.com',
  'unsplash.it',
  'pixabay.com',
  'picsum.photos',
  'placehold.co',
  'placeholder.com',
  'via.placeholder.com',
  'loremflickr.com',
  'dummyimage.com',
  'fakeimg.pl',
  'freepik.com',
  'shutterstock.com',
  'gettyimages.com',
  'istockphoto.com',
]

function isBlockedHost(hostname) {
  const host = String(hostname || '').toLowerCase()
  if (!host) return false
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
}

/**
 * @param {unknown} raw
 * @returns {string | null} safe src for <img src> or null to skip the request
 */
export function getSafeImageSrc(raw) {
  if (raw == null) return null
  const src = typeof raw === 'string' ? raw.trim() : ''
  if (!src) return null

  if (src.startsWith('blob:') || src.startsWith('data:')) return src
  if (src.startsWith('/')) return src

  let url
  try {
    url = new URL(src, typeof window !== 'undefined' && window.location?.href ? window.location.href : 'http://local.invalid')
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (isBlockedHost(url.hostname)) return null

  return src
}

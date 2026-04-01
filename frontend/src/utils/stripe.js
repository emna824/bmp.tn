const STRIPE_JS_URL = 'https://js.stripe.com/v3'

let stripeInstancePromise = null
let stripeScriptPromise = null

function loadStripeScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  if (window.Stripe) {
    return Promise.resolve(window.Stripe)
  }

  if (stripeScriptPromise) {
    return stripeScriptPromise
  }

  stripeScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${STRIPE_JS_URL}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.Stripe || null), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Stripe.js')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = STRIPE_JS_URL
    script.async = true
    script.onload = () => resolve(window.Stripe || null)
    script.onerror = () => reject(new Error('Failed to load Stripe.js'))
    document.head.appendChild(script)
  })

  return stripeScriptPromise
}

export async function getStripeClient() {
  if (stripeInstancePromise) {
    return stripeInstancePromise
  }

  stripeInstancePromise = (async () => {
    const publishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim()
    if (!publishableKey) {
      return null
    }

    const stripeFactory = await loadStripeScript()
    if (!stripeFactory) {
      return null
    }

    return stripeFactory(publishableKey)
  })()

  return stripeInstancePromise
}

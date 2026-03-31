let googleMapsPromise

export function loadGoogleMapsPlaces(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key'))
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google)
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google?.maps?.places) {
        resolve(window.google)
        return
      }
      reject(new Error('Google Maps Places library failed to load'))
    }

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}

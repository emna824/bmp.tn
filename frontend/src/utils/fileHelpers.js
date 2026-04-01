export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read file'))
      }
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export function downloadDataUrlFile(dataUrl, name = 'document.pdf') {
  const parts = dataUrl.split(',')
  if (parts.length < 2) {
    throw new Error('Invalid document data')
  }
  const binaryString = atob(parts[1])
  const buffer = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i += 1) {
    buffer[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadFileReference(fileReference, name = 'document.pdf') {
  if (!fileReference) {
    throw new Error('Invalid document data')
  }

  if (String(fileReference).startsWith('data:')) {
    downloadDataUrlFile(fileReference, name)
    return
  }

  const anchor = document.createElement('a')
  anchor.href = fileReference
  anchor.download = name
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

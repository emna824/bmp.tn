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

function normalizePdfText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/[•·]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\x0A\x20-\x7E]/g, ' ')
}

function escapePdfText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapPdfText(value, maxLength = 88) {
  const normalized = normalizePdfText(value)
  const blocks = normalized.split('\n')
  const lines = []

  blocks.forEach((block) => {
    const trimmed = block.trim()
    if (!trimmed) {
      lines.push('')
      return
    }

    const words = trimmed.split(/\s+/)
    let current = ''

    words.forEach((word) => {
      const nextLine = current ? `${current} ${word}` : word
      if (nextLine.length <= maxLength) {
        current = nextLine
        return
      }

      if (current) {
        lines.push(current)
      }

      if (word.length > maxLength) {
        for (let index = 0; index < word.length; index += maxLength) {
          lines.push(word.slice(index, index + maxLength))
        }
        current = ''
        return
      }

      current = word
    })

    if (current) {
      lines.push(current)
    }
  })

  return lines.length ? lines : ['']
}

export function buildPdfDataUrlFromText(title = 'Product Documentation', body = '') {
  const titleLines = wrapPdfText(title, 70)
  const bodyLines = wrapPdfText(body, 88)
  const allLines = [...titleLines, '', ...bodyLines]
  const linesPerPage = 44
  const pages = []

  for (let index = 0; index < allLines.length; index += linesPerPage) {
    pages.push(allLines.slice(index, index + linesPerPage))
  }

  if (!pages.length) {
    pages.push(['Product Documentation'])
  }

  const objects = []
  let objectIndex = 1

  const reserveObject = () => {
    const nextId = objectIndex
    objectIndex += 1
    return nextId
  }

  const catalogId = reserveObject()
  const pagesId = reserveObject()
  const fontId = reserveObject()

  const pageEntries = pages.map((lines, pageIndex) => {
    const pageId = reserveObject()
    const contentId = reserveObject()
    const startY = 780
    const operations = [
      'BT',
      '/F1 11 Tf',
      '14 TL',
      `50 ${startY} Td`,
    ]

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        operations.push('T*')
      }

      const safeLine = escapePdfText(line || ' ')
      operations.push(`(${safeLine}) Tj`)
    })

    operations.push('ET')

    const stream = operations.join('\n')
    return { pageId, contentId, stream, pageIndex }
  })

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId] = `<< /Type /Pages /Kids [${pageEntries
    .map((entry) => `${entry.pageId} 0 R`)
    .join(' ')}] /Count ${pageEntries.length} >>`
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  pageEntries.forEach(({ pageId, contentId, stream }) => {
    objects[pageId] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })

  let pdf = '%PDF-1.4\n'
  const offsets = []

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length}\n`
  pdf += '0000000000 65535 f \n'

  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return `data:application/pdf;base64,${btoa(pdf)}`
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

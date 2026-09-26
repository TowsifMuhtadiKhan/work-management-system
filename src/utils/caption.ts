import DOMPurify from 'dompurify'

const PREFIX = '<!--caption-rich-v1-->'

export function captionHTML(value: string) {
  if (!value.startsWith(PREFIX)) {
    return value.split('\n').map(line => `<p>${line.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') || '<br>'}</p>`).join('')
  }
  return DOMPurify.sanitize(value.slice(PREFIX.length), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

export function serializeCaption(html: string) {
  return PREFIX + captionHTML(PREFIX + html)
}

export function captionText(value: string | null | undefined): string {
  if (!value) return ''
  if (!value.startsWith(PREFIX)) return value
  const doc = new DOMParser().parseFromString(captionHTML(value), 'text/html')
  doc.querySelectorAll('br').forEach(node => node.replaceWith('\n'))
  doc.querySelectorAll('p, li, blockquote').forEach(node => node.append('\n'))
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

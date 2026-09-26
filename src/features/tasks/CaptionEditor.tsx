import { useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2, Link, Unlink, RemoveFormatting, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { captionHTML, captionText, serializeCaption } from '@/utils/caption'

export function CaptionEditor({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" aria-label={disabled ? 'View caption' : 'Edit caption'} onClick={() => setOpen(true)} className="flex w-full min-w-56 max-w-80 items-start gap-2 rounded-md border border-violet-200 bg-violet-50/60 p-2 text-left text-xs text-violet-950 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100">
      <Pencil className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span className="line-clamp-2 whitespace-pre-wrap break-words">{captionText(value) || 'Write a caption...'}</span>
    </button>
    {open && <CaptionDialog value={value} disabled={disabled} onClose={() => setOpen(false)} onApply={next => { onChange(next); setOpen(false) }} />}
  </>
}

function CaptionDialog({ value, disabled, onClose, onApply }: { value: string; disabled: boolean; onClose: () => void; onApply: (value: string) => void }) {
  const [linkURL, setLinkURL] = useState('')
  const [showLink, setShowLink] = useState(false)
  const [error, setError] = useState('')
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, code: false, codeBlock: false, horizontalRule: false, link: { openOnClick: false, autolink: false, defaultProtocol: 'https' } })],
    content: captionHTML(value),
    editable: !disabled,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { role: 'textbox', 'aria-label': 'Caption text', 'aria-multiline': 'true', class: 'caption-document min-h-64 p-4 outline-none' } },
  })
  const toolbar = editor ? [
    { label: 'Bold', icon: Bold, active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { label: 'Italic', icon: Italic, active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Underline', icon: Underline, active: editor.isActive('underline'), run: () => editor.chain().focus().toggleUnderline().run() },
    { label: 'Bullet list', icon: List, active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Add link', icon: Link, active: editor.isActive('link'), run: () => { setLinkURL(String(editor.getAttributes('link').href ?? '')); setShowLink(true) } },
    { label: 'Remove link', icon: Unlink, run: () => editor.chain().focus().unsetLink().run() },
    { label: 'Clear formatting', icon: RemoveFormatting, run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
    { label: 'Undo', icon: Undo2, unavailable: !editor.can().undo(), run: () => editor.chain().focus().undo().run() },
    { label: 'Redo', icon: Redo2, unavailable: !editor.can().redo(), run: () => editor.chain().focus().redo().run() },
  ] : []
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
    <DialogHeader><DialogTitle>{disabled ? 'Caption' : 'Edit caption'}</DialogTitle><DialogDescription>Format your caption, apply it to the row, then save the row to keep your changes.</DialogDescription></DialogHeader>
    <div className="rounded-lg border border-violet-200 dark:border-violet-800 overflow-hidden">
      {!disabled && <div role="toolbar" aria-label="Caption formatting" className="flex flex-wrap gap-1 border-b bg-violet-50 dark:bg-violet-950/40 p-2">{toolbar.map(item => <Button key={item.label} type="button" variant={item.active ? 'secondary' : 'ghost'} size="icon" title={item.label} aria-label={item.label} aria-pressed={item.active} disabled={item.unavailable} onMouseDown={e => e.preventDefault()} onClick={item.run}><item.icon className="h-4 w-4" /></Button>)}</div>}
      {showLink && <div className="p-3 border-b flex flex-wrap gap-2"><Input aria-label="Link URL" placeholder="https://example.com" value={linkURL} onChange={e => setLinkURL(e.target.value)} className="flex-1" /><Button type="button" onClick={() => {
        try { const url = new URL(linkURL); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); editor?.chain().focus().extendMarkRange('link').setLink({ href: url.href }).run(); setShowLink(false); setError('') } catch { setError('Enter a valid http or https link.') }
      }}>Apply link</Button><Button type="button" variant="ghost" onClick={() => { setShowLink(false); setError('') }}>Cancel link</Button>{error && <p role="alert" className="text-destructive text-sm w-full">{error}</p>}</div>}
      <EditorContent editor={editor} className="max-h-[45vh] overflow-y-auto bg-background" />
    </div>
    <p className="text-xs text-muted-foreground">{editor?.getText().length ?? 0} characters · Ctrl+B bold · Ctrl+I italic · Enter for a new paragraph</p>
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{disabled ? 'Close' : 'Cancel'}</Button>{!disabled && <Button type="button" disabled={!editor} onClick={() => { if (editor) onApply(editor.isEmpty ? '' : serializeCaption(editor.getHTML())) }}>Apply caption</Button>}</DialogFooter>
  </DialogContent></Dialog>
}

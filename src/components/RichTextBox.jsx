import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

export default function RichTextBox({ value, onSave, placeholder = 'Start typing…' }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[60px] text-ink-900',
      },
    },
  })

  // keep editor in sync if the underlying value changes from outside (e.g. after a reload)
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) return null

  return (
    <div
      className="bg-sage-50 rounded-xl px-3 py-2.5 border border-transparent focus-within:border-forest-600"
      onBlur={() => onSave(editor.getHTML())}
    >
      <EditorContent editor={editor} />
      {editor.isEmpty && (
        <p className="text-ink-400 text-sm -mt-[26px] pointer-events-none">{placeholder}</p>
      )}
    </div>
  )
}

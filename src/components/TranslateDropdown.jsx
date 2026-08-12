import { useState, useRef, useEffect } from 'react'
import { IconLanguage, IconChevronDown } from '@tabler/icons-react'

const LANGUAGES = [
  { code: 'pl', label: 'Polish' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
]

export default function TranslateDropdown({ onSelect, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-full border border-sage-200 px-4 py-2 text-sm text-ink-900 disabled:opacity-50"
      >
        <IconLanguage size={15} /> Translate <IconChevronDown size={13} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-sage-200 overflow-hidden z-10">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setOpen(false)
                onSelect(lang.code)
              }}
              className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-sage-50"
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

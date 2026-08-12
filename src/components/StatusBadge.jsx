const STYLES = {
  draft: 'bg-sage-200 text-ink-600',
  in_review: 'bg-warn-100 text-warn-600',
  published: 'bg-forest-600 text-white',
}

const LABELS = {
  draft: 'Draft',
  in_review: 'In review',
  published: 'Published',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STYLES[status] ?? STYLES.draft}`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}

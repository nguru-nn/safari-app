import { useEffect, useState } from 'react'
import { IconX, IconPlus, IconRefresh, IconGripVertical } from '@tabler/icons-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  addInclusionExclusion,
  deleteInclusionExclusion,
  resetDefaultInclusions,
  reorderInclusionExclusions,
} from '../lib/itineraries'

export default function InclusionsExclusions({ itineraryId, items, onChanged }) {
  const included = items.filter((i) => i.type === 'included').sort((a, b) => a.sort_order - b.sort_order)
  const excluded = items.filter((i) => i.type === 'excluded').sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Column title="Included" type="included" items={included} itineraryId={itineraryId} onChanged={onChanged} />
      <Column title="Excluded" type="excluded" items={excluded} itineraryId={itineraryId} onChanged={onChanged} />
    </div>
  )
}

function Column({ title, type, items, itineraryId, onChanged }) {
  const [newText, setNewText] = useState('')
  const [busy, setBusy] = useState(false)
  // Local order shown immediately on drag; committed to the DB on drop, then
  // the next `items` prop (post-refresh) becomes the new source of truth.
  const [localItems, setLocalItems] = useState(items)
  const [dragging, setDragging] = useState(false)

  // Keep local order in sync with the parent's real data (add/remove/reset),
  // but never stomp on an order the user is actively mid-drag on.
  useEffect(() => {
    if (!dragging) setLocalItems(items)
  }, [items, dragging])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  async function handleDragEnd(event) {
    const { active, over } = event
    setDragging(false)
    if (!over || active.id === over.id) return

    const oldIndex = localItems.findIndex((i) => i.id === active.id)
    const newIndex = localItems.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(localItems, oldIndex, newIndex)
    setLocalItems(reordered)

    try {
      await reorderInclusionExclusions(reordered.map((item, index) => ({ id: item.id, sort_order: index })))
      onChanged()
    } catch (err) {
      setLocalItems(items) // revert on failure
      console.error(err)
    }
  }

  async function handleAdd() {
    if (!newText.trim()) return
    const nextOrder = items.length
    await addInclusionExclusion(itineraryId, type, newText.trim(), nextOrder)
    setNewText('')
    onChanged()
  }

  async function handleRemove(itemId) {
    await deleteInclusionExclusion(itemId)
    onChanged()
  }

  async function handleReset() {
    setBusy(true)
    try {
      await resetDefaultInclusions(itineraryId)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-medium">{title}</span>
        <button
          onClick={handleReset}
          disabled={busy}
          className="flex items-center gap-1 text-xs text-ink-600 hover:text-forest-600"
          title="Reset defaults"
        >
          <IconRefresh size={13} /> Reset defaults
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {localItems.map((item) => (
              <SortableRow key={item.id} item={item} onRemove={handleRemove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 mt-3 pt-3 border-t border-sage-200">
        <input
          type="text"
          placeholder={`Add a custom ${type === 'included' ? 'inclusion' : 'exclusion'}`}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 rounded-full border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
        />
        <button onClick={handleAdd} className="rounded-full bg-sage-200 p-2">
          <IconPlus size={14} />
        </button>
      </div>
    </div>
  )
}

function SortableRow({ item, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1.5 px-1 py-1.5 rounded-md hover:bg-sage-50"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-ink-300 hover:text-ink-600 cursor-grab active:cursor-grabbing mt-0.5 touch-none"
        title="Drag to reorder"
      >
        <IconGripVertical size={14} />
      </button>
      <span className="flex-1 text-sm leading-snug">{item.text}</span>
      <button onClick={() => onRemove(item.id)} className="text-ink-400 hover:text-danger-600 mt-0.5">
        <IconX size={14} />
      </button>
    </div>
  )
}

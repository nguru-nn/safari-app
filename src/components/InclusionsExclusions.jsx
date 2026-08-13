import { useEffect, useState } from 'react'
import { IconX, IconPlus, IconRefresh, IconGripVertical, IconDeviceFloppy, IconCheck } from '@tabler/icons-react'
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
  updateInclusionExclusion,
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [localItems, setLocalItems] = useState(items)
  const [dragging, setDragging] = useState(false)
  const [edits, setEdits] = useState({}) // { [itemId]: newText }

  useEffect(() => {
    if (!dragging) setLocalItems(items)
  }, [items, dragging])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const hasEdits = Object.keys(edits).length > 0

  function handleEditChange(itemId, text) {
    setEdits((prev) => {
      const original = items.find((i) => i.id === itemId)?.text
      if (text === original) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: text }
    })
  }

  async function handleSaveAll() {
    if (!hasEdits) return
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(edits).map(([id, text]) => updateInclusionExclusion(id, text))
      )
      setEdits({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await onChanged()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

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
              <SortableRow
                key={item.id}
                item={item}
                editedText={edits[item.id]}
                onEditChange={(text) => handleEditChange(item.id, text)}
                onRemove={handleRemove}
              />
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

      {/* Save button for edits */}
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSaveAll}
          disabled={!hasEdits || saving}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            saved
              ? 'bg-forest-600/10 text-forest-600'
              : hasEdits
              ? 'bg-forest-600 text-white hover:bg-forest-700'
              : 'bg-sage-200 text-ink-400 cursor-not-allowed'
          }`}
        >
          {saved ? (
            <><IconCheck size={13} /> Saved</>
          ) : (
            <><IconDeviceFloppy size={13} /> {saving ? 'Saving…' : 'Save changes'}</>
          )}
        </button>
      </div>
    </div>
  )
}

function SortableRow({ item, editedText, onEditChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const displayText = editedText ?? item.text
  const isEdited = editedText !== undefined

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1.5 px-1 py-1 rounded-md hover:bg-sage-50"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-ink-300 hover:text-ink-600 cursor-grab active:cursor-grabbing mt-1.5 touch-none"
        title="Drag to reorder"
      >
        <IconGripVertical size={14} />
      </button>
      <input
        type="text"
        value={displayText}
        onChange={(e) => onEditChange(e.target.value)}
        className={`flex-1 text-sm leading-snug bg-transparent outline-none border-b py-0.5 ${
          isEdited ? 'border-forest-600' : 'border-transparent hover:border-sage-200 focus:border-forest-600'
        }`}
      />
      <button onClick={() => onRemove(item.id)} className="text-ink-400 hover:text-danger-600 mt-1">
        <IconX size={14} />
      </button>
    </div>
  )
}

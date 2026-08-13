import { IconEdit, IconAlertTriangle } from '@tabler/icons-react'
import DayAccordionItem from './DayAccordionItem'

const ACTIVITY_LABELS = {
  airport_transfer: 'Transfer',
  game_drive: 'Game drive',
  hot_air_balloon: 'Balloon',
  cultural_visit: 'Cultural visit',
  bushwalk: 'Bushwalk',
  night_game_drive: 'Night drive',
  sundowner: 'Sundowner',
  cycling: 'Cycling',
  boat_tour: 'Boat tour',
  city_tour: 'City tour',
  shopping: 'Shopping',
  farm_tour: 'Farm tour',
  rest_day: 'Rest day',
}

export default function DayReviewRow({ day, issuesForDay, isExpanded, onToggleExpand, onChanged, isLastDay }) {
  const blockCount = day.day_content_blocks?.length ?? 0
  const hotelLabel = day.hotel_description ? stripHtml(day.hotel_description).slice(0, 40) : null

  if (isExpanded) {
    return (
      <DayAccordionItem day={day} isOpen onToggle={onToggleExpand} onChanged={onChanged} isLastDay={isLastDay} />
    )
  }

  const hasIssues = issuesForDay.length > 0

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        hasIssues ? 'bg-warn-100' : 'bg-white'
      }`}
    >
      <span className={`text-sm font-medium w-14 ${hasIssues ? 'text-warn-600' : 'text-ink-900'}`}>
        Day {day.day_number}
      </span>

      <div className="flex-1 min-w-0">
        {hasIssues ? (
          <div className="flex items-center gap-1.5 text-sm text-warn-600">
            <IconAlertTriangle size={14} className="shrink-0" />
            <span className="truncate">{issuesForDay.map((i) => i.message).join(' · ')}</span>
          </div>
        ) : (
          <span className="text-sm text-ink-600 truncate block">
            {blockCount} text block{blockCount === 1 ? '' : 's'}
            {hotelLabel ? ` · ${hotelLabel}` : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {(day.day_activities ?? []).slice(0, 2).map((a) => (
          <span
            key={a.id}
            className="text-xs px-2 py-1 rounded-full bg-sage-100 text-ink-600 whitespace-nowrap"
          >
            {ACTIVITY_LABELS[a.activity] ?? a.activity}
          </span>
        ))}
      </div>

      <button onClick={onToggleExpand} className="text-ink-600 hover:text-forest-600 shrink-0">
        <IconEdit size={16} />
      </button>
    </div>
  )
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

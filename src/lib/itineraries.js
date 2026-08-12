import { supabase } from './supabase'

// ---- Itineraries ----

export async function listItineraries() {
  const { data, error } = await supabase
    .from('itineraries')
    .select('id, itinerary_name, client_name, status, language, updated_at')
    .is('parent_id', null) // top-level trips only; translations show nested under their parent
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getItinerary(id) {
  const { data, error } = await supabase
    .from('itineraries')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Translations of an itinerary are hidden from the main Dashboard list (parent_id IS NULL
// there), so this is the only way to discover them — used on the Review page.
export async function listTranslations(itineraryId) {
  const { data, error } = await supabase
    .from('itineraries')
    .select('id, itinerary_name, language, status, updated_at')
    .eq('parent_id', itineraryId)
    .order('language')
  if (error) throw error
  return data
}

export async function createItinerary({ itineraryName, clientName, safariType, transportation }) {
  const { data, error } = await supabase
    .from('itineraries')
    .insert({
      itinerary_name: itineraryName,
      client_name: clientName,
      safari_type: safariType,
      transportation,
    })
    .select()
    .single()
  if (error) throw error
  return data // trigger auto-seeds default inclusions/exclusions on insert
}

export async function updateItinerary(id, patch) {
  const { data, error } = await supabase
    .from('itineraries')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteItinerary(id) {
  const { error } = await supabase.from('itineraries').delete().eq('id', id)
  if (error) throw error
}

// ---- Days ----

export async function listDays(itineraryId) {
  const { data, error } = await supabase
    .from('itinerary_days')
    .select(`
      *,
      day_content_blocks ( id, content, sort_order ),
      day_activities ( id, activity ),
      day_hotel_images ( id, image_url, hotel_image_id, sort_order )
    `)
    .eq('itinerary_id', itineraryId)
    .order('day_number', { ascending: true })
  if (error) throw error
  return data
}

// Adds the next day with the default 2 blank content blocks. Enforces the 21-day cap client-side too.
export async function addDay(itineraryId, nextDayNumber) {
  if (nextDayNumber > 21) throw new Error('Itineraries are capped at 21 days')

  const { data: day, error: dayError } = await supabase
    .from('itinerary_days')
    .insert({ itinerary_id: itineraryId, day_number: nextDayNumber })
    .select()
    .single()
  if (dayError) throw dayError

  const { error: blocksError } = await supabase
    .from('day_content_blocks')
    .insert([
      { day_id: day.id, sort_order: 0, content: '' },
      { day_id: day.id, sort_order: 1, content: '' },
    ])
  if (blocksError) throw blocksError

  return day
}

export async function deleteDay(dayId) {
  const { error } = await supabase.from('itinerary_days').delete().eq('id', dayId)
  if (error) throw error
}

export async function updateDay(dayId, patch) {
  const { data, error } = await supabase
    .from('itinerary_days')
    .update(patch)
    .eq('id', dayId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ---- Content blocks ----

export async function addContentBlock(dayId, sortOrder) {
  const { data, error } = await supabase
    .from('day_content_blocks')
    .insert({ day_id: dayId, sort_order: sortOrder, content: '' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContentBlock(blockId, content) {
  const { error } = await supabase
    .from('day_content_blocks')
    .update({ content })
    .eq('id', blockId)
  if (error) throw error
}

export async function deleteContentBlock(blockId) {
  const { error } = await supabase.from('day_content_blocks').delete().eq('id', blockId)
  if (error) throw error
}

// ---- Activities (checkboxes) ----

export async function setDayActivity(dayId, activity, checked) {
  if (checked) {
    const { error } = await supabase
      .from('day_activities')
      .insert({ day_id: dayId, activity })
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('day_activities')
      .delete()
      .eq('day_id', dayId)
      .eq('activity', activity)
    if (error) throw error
  }
}

// ---- Hotel library ----

export async function listHotels(searchTerm = '') {
  let query = supabase.from('hotels').select('id, name, description, hotel_images ( id, image_url, sort_order )')
  if (searchTerm) query = query.ilike('name', `%${searchTerm}%`)
  const { data, error } = await query.order('name')
  if (error) throw error
  return data
}

export async function createHotel(name, description) {
  const { data, error } = await supabase
    .from('hotels')
    .insert({ name, description })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addHotelImage(hotelId, imageUrl, sortOrder) {
  const { data, error } = await supabase
    .from('hotel_images')
    .insert({ hotel_id: hotelId, image_url: imageUrl, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

// Deleting a hotel image from the library doesn't break trips that already used it —
// day_hotel_images copies the image_url at attach-time and its hotel_image_id
// foreign key is ON DELETE SET NULL, so past trips keep showing the photo.
export async function deleteHotelImage(imageId) {
  const { error } = await supabase.from('hotel_images').delete().eq('id', imageId)
  if (error) throw error
}

// Same story for deleting a whole hotel — itinerary_days.hotel_id is ON DELETE SET NULL,
// so it only detaches the library link, it never touches a trip's own saved content.
export async function deleteHotel(hotelId) {
  const { error } = await supabase.from('hotels').delete().eq('id', hotelId)
  if (error) throw error
}

// Applies a library hotel to a day: sets hotel_id + auto-fills hotel_description,
// and attaches the chosen images to day_hotel_images (max 5 enforced client-side).
export async function applyHotelToDay(dayId, hotel, selectedImages) {
  if (selectedImages.length > 5) throw new Error('Choose at most 5 images')

  await updateDay(dayId, { hotel_id: hotel.id, hotel_description: hotel.description ?? '' })

  await supabase.from('day_hotel_images').delete().eq('day_id', dayId)

  const rows = selectedImages.map((img, i) => ({
    day_id: dayId,
    image_url: img.image_url,
    hotel_image_id: img.id ?? null, // null means it was a fresh upload, not from the library
    sort_order: i,
  }))
  const { error } = await supabase.from('day_hotel_images').insert(rows)
  if (error) throw error
}

// ---- Inclusions / exclusions ----

export async function listInclusionExclusions(itineraryId) {
  const { data, error } = await supabase
    .from('inclusion_exclusion_items')
    .select('*')
    .eq('itinerary_id', itineraryId)
    .order('sort_order')
  if (error) throw error
  return data
}

export async function addInclusionExclusion(itineraryId, type, text, sortOrder) {
  const { data, error } = await supabase
    .from('inclusion_exclusion_items')
    .insert({ itinerary_id: itineraryId, type, text, is_default: false, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInclusionExclusion(itemId) {
  const { error } = await supabase.from('inclusion_exclusion_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function reorderInclusionExclusions(items) {
  // items: [{ id, sort_order }]
  const updates = items.map((i) =>
    supabase.from('inclusion_exclusion_items').update({ sort_order: i.sort_order }).eq('id', i.id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed) throw failed.error
}

export async function resetDefaultInclusions(itineraryId) {
  const { error } = await supabase.rpc('reset_default_inclusions', { p_itinerary_id: itineraryId })
  if (error) throw error
}

// ---- Pricing ----

export async function listPricing(itineraryId) {
  const { data, error } = await supabase
    .from('pricing')
    .select('*')
    .eq('itinerary_id', itineraryId)
  if (error) throw error
  return data
}

export async function upsertPricing(itineraryId, tier, price, quantity = 0, currency = 'USD') {
  const { data, error } = await supabase
    .from('pricing')
    .upsert({ itinerary_id: itineraryId, tier, price, quantity, currency }, { onConflict: 'itinerary_id,tier' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ---- Review / publish workflow ----

export async function submitForReview(id) {
  return updateItinerary(id, { status: 'in_review' })
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function publishItinerary(id, reviewerId) {
  const current = await getItinerary(id)
  const patch = {
    status: 'published',
    published_at: new Date().toISOString(),
    reviewed_by: reviewerId,
  }

  // Generate a slug the first time a trip is published — stays stable after that,
  // since it's part of the public URL and shouldn't change on re-publish.
  if (!current.slug) {
    const base = slugify(`${current.itinerary_name}-${current.client_name}`) || 'safari'
    patch.slug = `${base}-${current.id.slice(0, 6)}`
  }

  return updateItinerary(id, patch)
}

export async function saveReviewNotes(id, notes) {
  return updateItinerary(id, { review_notes: notes })
}

// Client-side validation the Review page uses to gate Publish.
// Doesn't touch the database — just reads what's already loaded.
export function validateItinerary(itinerary, days, pricing) {
  const issues = []

  if (!itinerary.hero_image_url) {
    issues.push({ scope: 'trip', message: 'Hero image is missing' })
  }

  const requiredTiers = ['adult', 'child_12plus', 'child_3_12']
  const missingTiers = requiredTiers.filter((t) => !pricing.some((p) => p.tier === t))
  if (missingTiers.length) {
    const labels = { adult: 'adult', child_12plus: 'child 12+', child_3_12: 'child 3–12' }
    issues.push({
      scope: 'trip',
      message: `Missing price for ${missingTiers.map((t) => labels[t]).join(', ')}`,
    })
  }

  for (const day of days) {
    const hasText = (day.day_content_blocks ?? []).some((b) => (b.content ?? '').replace(/<[^>]*>/g, '').trim())
    if (!hasText) {
      issues.push({ scope: 'day', dayId: day.id, dayNumber: day.day_number, message: 'itinerary text is empty' })
    }
    if (!(day.day_activities ?? []).length) {
      issues.push({ scope: 'day', dayId: day.id, dayNumber: day.day_number, message: 'no activities selected' })
    }
    const hotelText = (day.hotel_description ?? '').replace(/<[^>]*>/g, '').trim()
    if (!hotelText) {
      issues.push({ scope: 'day', dayId: day.id, dayNumber: day.day_number, message: 'hotel description is empty' })
    }
  }

  return issues
}

// ---- Duplication (reuse a past trip as a template for a new client) ----

// Unlike createTranslation, this is NOT linked via parent_id — it's an
// independent itinerary for a different client, always starts as a draft,
// and gets its own slug whenever it's eventually published.
export async function duplicateItinerary(sourceId, { itineraryName, clientName }) {
  const source = await getItinerary(sourceId)

  const { data: copy, error: createError } = await supabase
    .from('itineraries')
    .insert({
      itinerary_name: itineraryName,
      client_name: clientName,
      safari_type: source.safari_type,
      transportation: source.transportation,
      hero_image_url: source.hero_image_url,
      language: source.language,
      // parent_id, slug, status, published_at, reviewed_by, review_notes all
      // default to a clean slate (draft, unpublished, no notes carried over)
    })
    .select()
    .single()
  if (createError) throw createError

  const days = await listDays(sourceId)
  for (const day of days) {
    const { data: newDay, error: dayError } = await supabase
      .from('itinerary_days')
      .insert({
        itinerary_id: copy.id,
        day_number: day.day_number,
        hotel_id: day.hotel_id,
        hotel_description: day.hotel_description,
        sort_order: day.sort_order,
      })
      .select()
      .single()
    if (dayError) throw dayError

    if (day.day_content_blocks?.length) {
      await supabase.from('day_content_blocks').insert(
        day.day_content_blocks.map((b) => ({ day_id: newDay.id, content: b.content, sort_order: b.sort_order }))
      )
    }
    if (day.day_activities?.length) {
      await supabase.from('day_activities').insert(
        day.day_activities.map((a) => ({ day_id: newDay.id, activity: a.activity }))
      )
    }
    if (day.day_hotel_images?.length) {
      await supabase.from('day_hotel_images').insert(
        day.day_hotel_images.map((img) => ({
          day_id: newDay.id,
          image_url: img.image_url,
          hotel_image_id: img.hotel_image_id,
          sort_order: img.sort_order,
        }))
      )
    }
  }

  // The insert trigger already auto-seeded copy.id with fresh default inclusions/exclusions.
  // Replace that with an exact copy of the source's actual list instead — this preserves
  // any defaults the source had removed, and any custom items it added, faithfully.
  const sourceItems = await listInclusionExclusions(sourceId)
  await supabase.from('inclusion_exclusion_items').delete().eq('itinerary_id', copy.id)
  if (sourceItems.length) {
    await supabase.from('inclusion_exclusion_items').insert(
      sourceItems.map((i) => ({
        itinerary_id: copy.id,
        type: i.type,
        text: i.text,
        is_default: i.is_default,
        sort_order: i.sort_order,
      }))
    )
  }

  // Pricing rates carry over as a starting point; quantities reset to 0 since
  // this is a different client with a different party size.
  const sourcePricing = await listPricing(sourceId)
  if (sourcePricing.length) {
    await supabase.from('pricing').insert(
      sourcePricing.map((p) => ({
        itinerary_id: copy.id,
        tier: p.tier,
        price: p.price,
        currency: p.currency,
        quantity: 0,
      }))
    )
  }

  return copy
}

// Duplicates an itinerary and all its child data into a new draft row for translation.
export async function createTranslation(sourceItineraryId, language) {
  const source = await getItinerary(sourceItineraryId)

  const { data: translated, error: createError } = await supabase
    .from('itineraries')
    .insert({
      itinerary_name: source.itinerary_name,
      client_name: source.client_name,
      safari_type: source.safari_type,
      transportation: source.transportation,
      hero_image_url: source.hero_image_url,
      parent_id: source.id,
      language,
    })
    .select()
    .single()
  if (createError) throw createError

  const days = await listDays(sourceItineraryId)
  for (const day of days) {
    const { data: newDay, error: dayError } = await supabase
      .from('itinerary_days')
      .insert({
        itinerary_id: translated.id,
        day_number: day.day_number,
        hotel_id: day.hotel_id,
        hotel_description: day.hotel_description,
        sort_order: day.sort_order,
      })
      .select()
      .single()
    if (dayError) throw dayError

    if (day.day_content_blocks?.length) {
      await supabase.from('day_content_blocks').insert(
        day.day_content_blocks.map((b) => ({ day_id: newDay.id, content: b.content, sort_order: b.sort_order }))
      )
    }
    if (day.day_activities?.length) {
      await supabase.from('day_activities').insert(
        day.day_activities.map((a) => ({ day_id: newDay.id, activity: a.activity }))
      )
    }
    if (day.day_hotel_images?.length) {
      await supabase.from('day_hotel_images').insert(
        day.day_hotel_images.map((img) => ({
          day_id: newDay.id,
          image_url: img.image_url,
          hotel_image_id: img.hotel_image_id,
          sort_order: img.sort_order,
        }))
      )
    }
  }

  // Custom (non-default) inclusions/exclusions carry over too; defaults are already
  // auto-seeded by the trigger on the new itinerary row.
  const sourceItems = await listInclusionExclusions(sourceItineraryId)
  const customItems = sourceItems.filter((i) => !i.is_default)
  if (customItems.length) {
    await supabase.from('inclusion_exclusion_items').insert(
      customItems.map((i) => ({
        itinerary_id: translated.id,
        type: i.type,
        text: i.text,
        is_default: false,
        sort_order: i.sort_order,
      }))
    )
  }

  const sourcePricing = await listPricing(sourceItineraryId)
  if (sourcePricing.length) {
    await supabase.from('pricing').insert(
      sourcePricing.map((p) => ({
        itinerary_id: translated.id,
        tier: p.tier,
        price: p.price,
        currency: p.currency,
      }))
    )
  }

  return translated
}

export const TIME_SLOTS = [
  ...Array.from({ length: 17 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`),
  '00:00', 'card',
]

export function slotLabel(slot: string) {
  if (!slot) return 'Unscheduled'
  if (slot === 'card') return 'Card'
  const hour = Number(slot.slice(0, 2))
  return `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`
}

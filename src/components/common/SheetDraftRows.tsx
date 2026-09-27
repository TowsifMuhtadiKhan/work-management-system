import { Fragment, useState, type ReactNode } from 'react'

export interface DraftRowActions {
  onStartEditing: () => void
  onRemove: () => void
}

export function SheetDraftRows({ children }: { children: (actions: DraftRowActions) => ReactNode }) {
  const [ids, setIds] = useState(() => [crypto.randomUUID()])
  return ids.map(id => <Fragment key={id}>{children({
    onStartEditing: () => {
      const nextId = crypto.randomUUID()
      setIds(current => current.at(-1) === id ? [...current, nextId] : current)
    },
    onRemove: () => {
      const nextId = crypto.randomUUID()
      setIds(current => {
        const remaining = current.filter(rowId => rowId !== id)
        return current.at(-1) === id ? [...remaining, nextId] : remaining
      })
    },
  })}</Fragment>)
}

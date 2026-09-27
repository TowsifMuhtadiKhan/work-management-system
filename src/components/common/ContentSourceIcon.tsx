import { Clapperboard } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ContentSourceIcon({ packageId }: { packageId?: string | null }) {
  if (!packageId) return null
  return <Link to={`/content-creator?package=${packageId}`} aria-label="From Content Creator" title="Approved Content Creator package" className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-100 text-red-700 hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-red-950 dark:text-red-300">
    <Clapperboard className="h-4 w-4" aria-hidden="true" />
  </Link>
}

import { captionText } from './caption'

type CompletionFields = {
  caption?: string | null
  remarks?: string | null
  youtube_link?: string | null
  facebook_link?: string | null
}

export function taskCompletionError(task: CompletionFields): string | null {
  if (!captionText(task.caption)) return 'Add a caption before marking this task as done.'
  if (!task.youtube_link?.trim()) return 'Add a YouTube link before marking this task as done.'
  if (!task.facebook_link?.trim()) return 'Add a Facebook link before marking this task as done.'
  return null
}

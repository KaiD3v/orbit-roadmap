export type Done = Record<string, true>
export type Challenges = Record<string, string>
export type DoneAt = Record<string, string>
export type ReviewStep = 0 | 1 | 2 | 3
export type Reviews = Record<string, { at: string, step: ReviewStep }>
export type Notes = Record<string, string>
export type ProgressData = {
  done: Done
  days: string[]
  challenges: Challenges
  doneAt: DoneAt
  reviews: Reviews
  notes: Notes
}
export type ProgressBackup = ProgressData & { version: 5 }

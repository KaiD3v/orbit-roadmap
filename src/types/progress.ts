export type Done = Record<string, true>
export type Challenges = Record<string, string>
export type ProgressData = { done: Done, days: string[], challenges: Challenges }
export type ProgressBackup = ProgressData & { version: 3 }

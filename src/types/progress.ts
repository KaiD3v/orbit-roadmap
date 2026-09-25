export type Done = Record<string, true>
export type ProgressData = { done: Done, days: string[] }
export type ProgressBackup = ProgressData & { version: 2 }

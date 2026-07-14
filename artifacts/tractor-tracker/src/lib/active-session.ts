export interface ActiveSession {
  workerId: number;
  workerName: string;
  fieldName: string;
  startTime: string;
}

const KEY = "fieldtrack_active_session";

export function saveSession(session: ActiveSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

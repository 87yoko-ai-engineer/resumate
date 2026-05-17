import type { ResumeData } from "./resume-schema";
import { emptyResume } from "./resume-schema";

const STORAGE_KEY = "ai-resume-builder:data";

export interface PersistedState {
  resume: ResumeData;
  jobPosting: string;
}

export function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      resume: { ...emptyResume(), ...parsed.resume },
      jobPosting: parsed.jobPosting ?? "",
    };
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 容量超過などは無視（自動保存はベストエフォート）
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

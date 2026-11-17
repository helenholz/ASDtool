import { emptyRecord, isPristine, normalizeRecord } from "./record";
import type { ChecklistRecord } from "./types";

const KEY = "asd-checklist.v1";

interface Store {
  currentId: string | null;
  records: ChecklistRecord[];
}

let memory: string | null = null;
let persistent = true;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    persistent = false;
    return memory;
  }
}

function writeRaw(value: string): boolean {
  memory = value;
  try {
    localStorage.setItem(KEY, value);
    persistent = true;
    return true;
  } catch {
    persistent = false;
    return false;
  }
}

function readStore(): Store {
  const raw = readRaw();
  if (!raw) return { currentId: null, records: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<Store>;
    const records = Array.isArray(parsed.records)
      ? parsed.records.map((item) => normalizeRecord(item)).filter((item): item is ChecklistRecord => item !== null)
      : [];
    const currentId = typeof parsed.currentId === "string" ? parsed.currentId : null;
    return { currentId, records };
  } catch {
    return { currentId: null, records: [] };
  }
}

function writeStore(store: Store): boolean {
  return writeRaw(JSON.stringify(store));
}

export function loadInitial(): ChecklistRecord {
  const store = readStore();
  const found = store.currentId ? store.records.find((record) => record.id === store.currentId) : undefined;
  return found ?? emptyRecord();
}

export function persist(record: ChecklistRecord): { records: ChecklistRecord[]; persistent: boolean } {
  const store = readStore();
  const others = store.records
    .filter((item) => item.id !== record.id && !isPristine(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 39);
  const records = [record, ...others];
  const ok = writeStore({ currentId: record.id, records });
  return { records, persistent: ok && persistent };
}

export function removeRecord(
  id: string,
  current: ChecklistRecord,
): { records: ChecklistRecord[]; next: ChecklistRecord | null; persistent: boolean } {
  const store = readStore();
  const remaining = store.records.filter((item) => item.id !== id && !isPristine(item));
  if (id !== current.id) {
    const records = [current, ...remaining.filter((item) => item.id !== current.id)];
    const ok = writeStore({ currentId: current.id, records });
    return { records, next: null, persistent: ok && persistent };
  }
  const next = remaining[0] ?? emptyRecord();
  const records = remaining.length > 0 ? remaining : [next];
  const ok = writeStore({ currentId: next.id, records });
  return { records, next, persistent: ok && persistent };
}

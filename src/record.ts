import {
  ASSOCIATED_KEYS,
  ETIOLOGY_KEYS,
  LANGUAGE_LEVELS,
  RATING_KEYS,
  SPECIFIER_KEYS,
  type ChecklistRecord,
  type EtiologyKey,
  type LanguageLevel,
  type Rating,
  type Severity,
} from "./types";

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

export function todayISO(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function blankRatings(): ChecklistRecord["ratings"] {
  return {
    a1: null,
    a2: null,
    a3: null,
    b1: null,
    b2: null,
    b3: null,
    b4: null,
    c: null,
  };
}

function blankSpecifiers(): ChecklistRecord["specifiers"] {
  return {
    intellectual: null,
    language: null,
    etiology: null,
    other: null,
    catatonia: null,
  };
}

function blankAssociated(): ChecklistRecord["associated"] {
  return {
    motor: null,
    novelty: null,
    injury: null,
    regression: null,
  };
}

export function emptyRecord(): ChecklistRecord {
  const now = new Date().toISOString();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    identity: { name: "", age: "", gender: "", clinician: "", date: "" },
    ratings: blankRatings(),
    prompts: {},
    socialSeverity: null,
    rrbSeverity: null,
    specifiers: blankSpecifiers(),
    language: null,
    etiology: [],
    etiologyDetail: "",
    otherDetail: "",
    associated: blankAssociated(),
    criterionE: false,
    note: "",
  };
}

export function isPristine(record: ChecklistRecord): boolean {
  const { identity } = record;
  if (identity.name || identity.age || identity.gender || identity.clinician || identity.date) return false;
  if (record.note.trim() || record.criterionE || record.etiologyDetail.trim() || record.otherDetail.trim()) return false;
  if (record.language || record.etiology.length) return false;
  if (record.socialSeverity !== null || record.rrbSeverity !== null) return false;
  const ratings = Object.values(record.ratings);
  const specifiers = Object.values(record.specifiers);
  const associated = Object.values(record.associated);
  if ([...ratings, ...specifiers, ...associated].some((value) => value !== null)) return false;
  return Object.values(record.prompts).some((ids) => ids.length > 0) ? false : true;
}

function asRating(value: unknown): Rating | null {
  return value === "absent" || value === "unsure" || value === "present" ? value : null;
}

function asSeverity(value: unknown): Severity {
  if (value === null || value === undefined || value === "") return null;
  if (value === "unsure") return "unsure";
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  if (value === "0" || value === "1" || value === "2" || value === "3") return Number(value) as 0 | 1 | 2 | 3;
  return null;
}

function asLanguage(value: unknown): LanguageLevel | null {
  return LANGUAGE_LEVELS.includes(value as LanguageLevel) ? (value as LanguageLevel) : null;
}

export function normalizeRecord(input: unknown): ChecklistRecord | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<ChecklistRecord>;
  if (typeof raw.id !== "string" || raw.id.trim() === "") return null;

  const record = emptyRecord();
  record.id = raw.id;
  record.createdAt = typeof raw.createdAt === "string" ? raw.createdAt : record.createdAt;
  record.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : record.createdAt;

  const identity = raw.identity;
  if (identity && typeof identity === "object") {
    record.identity = {
      name: typeof identity.name === "string" ? identity.name.slice(0, 120) : "",
      age: typeof identity.age === "string" ? identity.age.slice(0, 8) : "",
      gender: typeof identity.gender === "string" ? identity.gender.slice(0, 24) : "",
      clinician: typeof identity.clinician === "string" ? identity.clinician.slice(0, 120) : "",
      date: typeof identity.date === "string" ? identity.date.slice(0, 10) : "",
    };
  }

  if (raw.ratings && typeof raw.ratings === "object") {
    for (const key of RATING_KEYS) {
      record.ratings[key] = asRating(raw.ratings[key]);
    }
  }

  if (raw.prompts && typeof raw.prompts === "object") {
    for (const [key, value] of Object.entries(raw.prompts)) {
      if (!Array.isArray(value)) continue;
      const ids = value.filter((item): item is string => typeof item === "string").slice(0, 40);
      if (ids.length) record.prompts[key] = ids;
    }
  }

  record.socialSeverity = asSeverity(raw.socialSeverity);
  record.rrbSeverity = asSeverity(raw.rrbSeverity);

  if (raw.specifiers && typeof raw.specifiers === "object") {
    for (const key of SPECIFIER_KEYS) {
      record.specifiers[key] = asRating(raw.specifiers[key]);
    }
  }

  record.language = asLanguage(raw.language);
  record.etiology = Array.isArray(raw.etiology)
    ? raw.etiology.filter((item): item is EtiologyKey => ETIOLOGY_KEYS.includes(item as EtiologyKey))
    : [];
  record.etiologyDetail = typeof raw.etiologyDetail === "string" ? raw.etiologyDetail.slice(0, 300) : "";
  record.otherDetail = typeof raw.otherDetail === "string" ? raw.otherDetail.slice(0, 300) : "";

  if (raw.associated && typeof raw.associated === "object") {
    for (const key of ASSOCIATED_KEYS) {
      record.associated[key] = asRating(raw.associated[key]);
    }
  }

  record.criterionE = raw.criterionE === true;
  record.note = typeof raw.note === "string" ? raw.note.slice(0, 4000) : "";
  return record;
}

export function touch(record: ChecklistRecord, patch: Partial<ChecklistRecord>): ChecklistRecord {
  return { ...record, ...patch, updatedAt: new Date().toISOString() };
}

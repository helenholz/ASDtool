import { emptyRecord, isPristine, touch } from "./record";
import type {
  AssociatedKey,
  ChecklistRecord,
  EtiologyKey,
  LanguageLevel,
  Rating,
  RatingKey,
  Severity,
  SpecifierKey,
} from "./types";

export type Action =
  | { type: "identity"; field: keyof ChecklistRecord["identity"]; value: string }
  | { type: "rating"; key: RatingKey; value: Rating }
  | { type: "severity"; which: "social" | "rrb"; value: Severity }
  | { type: "prompt"; criterionId: string; promptId: string }
  | { type: "specifier"; key: SpecifierKey; value: Rating }
  | { type: "language"; value: LanguageLevel }
  | { type: "etiology"; key: EtiologyKey }
  | { type: "etiologyDetail"; value: string }
  | { type: "otherDetail"; value: string }
  | { type: "associated"; key: AssociatedKey; value: Rating }
  | { type: "criterionE"; value: boolean }
  | { type: "note"; value: string }
  | { type: "clear-ratings" }
  | { type: "load"; record: ChecklistRecord }
  | { type: "new" };

const IDENTITY_LIMITS: Record<keyof ChecklistRecord["identity"], number> = {
  name: 120,
  age: 8,
  gender: 24,
  clinician: 120,
  date: 10,
};

export function asAge(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned.slice(0, 5);
  const whole = cleaned.slice(0, dot).slice(0, 3);
  const fraction = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 1);
  return `${whole}.${fraction}`;
}

function clip(value: string, max: number): string {
  return value.slice(0, max);
}

function toggleRating<T extends string>(current: T | null, next: T): T | null {
  return current === next ? null : next;
}

export function reducer(record: ChecklistRecord, action: Action): ChecklistRecord {
  switch (action.type) {
    case "identity": {
      const value = action.field === "age" ? asAge(action.value) : clip(action.value, IDENTITY_LIMITS[action.field]);
      return touch(record, { identity: { ...record.identity, [action.field]: value } });
    }
    case "rating":
      return touch(record, {
        ratings: { ...record.ratings, [action.key]: toggleRating(record.ratings[action.key], action.value) },
      });
    case "severity": {
      const field = action.which === "social" ? "socialSeverity" : "rrbSeverity";
      const current = record[field];
      return touch(record, { [field]: current === action.value ? null : action.value });
    }
    case "prompt": {
      const current = record.prompts[action.criterionId] ?? [];
      const next = current.includes(action.promptId)
        ? current.filter((id) => id !== action.promptId)
        : [...current, action.promptId];
      return touch(record, { prompts: { ...record.prompts, [action.criterionId]: next } });
    }
    case "specifier": {
      const value = toggleRating(record.specifiers[action.key], action.value);
      const specifiers = { ...record.specifiers, [action.key]: value };
      if (action.key === "language" && value === "absent") return touch(record, { specifiers, language: null });
      if (action.key === "etiology" && value === "absent") {
        return touch(record, { specifiers, etiology: [], etiologyDetail: "" });
      }
      if (action.key === "other" && value === "absent") return touch(record, { specifiers, otherDetail: "" });
      return touch(record, { specifiers });
    }
    case "language":
      return touch(record, { language: record.language === action.value ? null : action.value });
    case "etiology": {
      const etiology = record.etiology.includes(action.key)
        ? record.etiology.filter((key) => key !== action.key)
        : [...record.etiology, action.key];
      return touch(record, { etiology });
    }
    case "etiologyDetail":
      return touch(record, { etiologyDetail: clip(action.value, 300) });
    case "otherDetail":
      return touch(record, { otherDetail: clip(action.value, 300) });
    case "associated":
      return touch(record, {
        associated: {
          ...record.associated,
          [action.key]: toggleRating(record.associated[action.key], action.value),
        },
      });
    case "criterionE":
      return touch(record, { criterionE: action.value });
    case "note":
      return touch(record, { note: clip(action.value, 4000) });
    case "clear-ratings": {
      const fresh = emptyRecord();
      return {
        ...fresh,
        id: record.id,
        createdAt: record.createdAt,
        updatedAt: new Date().toISOString(),
        identity: record.identity,
      };
    }
    case "load":
      return action.record;
    case "new":
      return isPristine(record) ? record : emptyRecord();
    default:
      return record;
  }
}

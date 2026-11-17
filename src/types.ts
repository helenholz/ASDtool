export const RATING_KEYS = ["a1", "a2", "a3", "b1", "b2", "b3", "b4", "c"] as const;
export type RatingKey = (typeof RATING_KEYS)[number];

export const A_KEYS = ["a1", "a2", "a3"] as const;
export const B_KEYS = ["b1", "b2", "b3", "b4"] as const;

export type Rating = "absent" | "unsure" | "present";

export const SPECIFIER_KEYS = ["intellectual", "language", "etiology", "other", "catatonia"] as const;
export type SpecifierKey = (typeof SPECIFIER_KEYS)[number];

export const ASSOCIATED_KEYS = ["motor", "novelty", "injury", "regression"] as const;
export type AssociatedKey = (typeof ASSOCIATED_KEYS)[number];

export const ETIOLOGY_KEYS = ["medical", "genetic", "environmental"] as const;
export type EtiologyKey = (typeof ETIOLOGY_KEYS)[number];

export const LANGUAGE_LEVELS = ["no-language", "single-words", "phrase"] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export type Severity = null | "unsure" | 0 | 1 | 2 | 3;
export type SeverityChoice = "unsure" | "0" | "1" | "2" | "3";

export interface Identity {
  name: string;
  age: string;
  gender: string;
  clinician: string;
  date: string;
}

export interface ChecklistRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  identity: Identity;
  ratings: Record<RatingKey, Rating | null>;
  prompts: Record<string, string[]>;
  socialSeverity: Severity;
  rrbSeverity: Severity;
  specifiers: Record<SpecifierKey, Rating | null>;
  language: LanguageLevel | null;
  etiology: EtiologyKey[];
  etiologyDetail: string;
  otherDetail: string;
  associated: Record<AssociatedKey, Rating | null>;
  criterionE: boolean;
  note: string;
}

export type DomainStatus = "met" | "not-met" | "incomplete";
export type Pattern = "asd" | "scd" | "not-met" | "incomplete";
export type PatternKind = "asd" | "scd" | "not-met" | "open" | "diverges";

export interface DomainTally {
  status: DomainStatus;
  present: number;
  unsure: number;
  absent: number;
  missing: number;
  required: number;
  total: number;
}

export interface Score {
  a: DomainTally;
  b: DomainTally;
  c: DomainTally;
  d: { status: DomainStatus };
  formRule: Pattern;
  fullPattern: Pattern;
  kind: PatternKind;
  unrated: string[];
  subthreshold: string[];
}

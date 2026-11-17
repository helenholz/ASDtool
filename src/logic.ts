import type {
  ChecklistRecord,
  DomainStatus,
  DomainTally,
  Pattern,
  PatternKind,
  Rating,
  RatingKey,
  Score,
  Severity,
} from "./types";
import { A_KEYS, B_KEYS } from "./types";

export interface ScoreInput {
  ratings: ChecklistRecord["ratings"];
  socialSeverity: Severity;
  rrbSeverity: Severity;
}

function tally(values: Array<Rating | null>, required: number): DomainTally {
  let present = 0;
  let unsure = 0;
  let absent = 0;
  let missing = 0;
  for (const value of values) {
    if (value === "present") present += 1;
    else if (value === "unsure") unsure += 1;
    else if (value === "absent") absent += 1;
    else missing += 1;
  }
  const total = values.length;
  let status: DomainStatus;
  if (present >= required) status = "met";
  else if (present + unsure + missing >= required) status = "incomplete";
  else status = "not-met";
  return { status, present, unsure, absent, missing, required, total };
}

function domainD(social: Severity, rrb: Severity): DomainStatus {
  if (social === null || rrb === null || social === "unsure" || rrb === "unsure") return "incomplete";
  if (social >= 1 || rrb >= 1) return "met";
  return "not-met";
}

function formRule(a: DomainStatus, b: DomainStatus): Pattern {
  if (a === "not-met") return "not-met";
  if (a === "incomplete") return "incomplete";
  if (b === "met") return "asd";
  if (b === "not-met") return "scd";
  return "incomplete";
}

function fullPattern(a: DomainStatus, b: DomainStatus, c: DomainStatus, d: DomainStatus): Pattern {
  if (a === "not-met" || c === "not-met" || d === "not-met") return "not-met";
  if (a === "met" && b === "not-met" && c === "met" && d === "met") return "scd";
  if (a === "met" && b === "met" && c === "met" && d === "met") return "asd";
  return "incomplete";
}

export function patternKind(form: Pattern, full: Pattern): PatternKind {
  if (form === "asd" && full === "asd") return "asd";
  if (form === "scd" && full === "scd") return "scd";
  if (form === "not-met" && full === "not-met") return "not-met";
  if (form === "incomplete" && full === "incomplete") return "open";
  if (full === "not-met" && form === "incomplete") return "not-met";
  return "diverges";
}

function collectOpen(input: ScoreInput): { unrated: string[]; subthreshold: string[] } {
  const unrated: string[] = [];
  const subthreshold: string[] = [];
  const keys: RatingKey[] = ["a1", "a2", "a3", "b1", "b2", "b3", "b4", "c"];
  for (const key of keys) {
    const value = input.ratings[key];
    if (value === null) unrated.push(key);
    else if (value === "unsure") subthreshold.push(key);
  }
  if (input.socialSeverity === null) unrated.push("dSocial");
  else if (input.socialSeverity === "unsure") subthreshold.push("dSocial");
  if (input.rrbSeverity === null) unrated.push("dRrb");
  else if (input.rrbSeverity === "unsure") subthreshold.push("dRrb");
  return { unrated, subthreshold };
}

export function scoreRecord(input: ScoreInput): Score {
  const a = tally(A_KEYS.map((key) => input.ratings[key]), 3);
  const b = tally(B_KEYS.map((key) => input.ratings[key]), 2);
  const c = tally([input.ratings.c], 1);
  const dStatus = domainD(input.socialSeverity, input.rrbSeverity);
  const form = formRule(a.status, b.status);
  const full = fullPattern(a.status, b.status, c.status, dStatus);
  const open = collectOpen(input);
  return {
    a,
    b,
    c,
    d: { status: dStatus },
    formRule: form,
    fullPattern: full,
    kind: patternKind(form, full),
    unrated: open.unrated,
    subthreshold: open.subthreshold,
  };
}

export function statusLabel(status: DomainStatus): string {
  if (status === "met") return "Met";
  if (status === "not-met") return "Not met";
  return "Open";
}

export function ratingLabel(value: Rating | null): string {
  if (value === "present") return "Present";
  if (value === "unsure") return "Unsure";
  if (value === "absent") return "Absent";
  return "Not rated";
}

export function severityLabel(value: Severity): string {
  if (value === null) return "Not rated";
  if (value === "unsure") return "Unsure";
  if (value === 0) return "No clinically significant impairment";
  if (value === 1) return "Level 1 — requiring support";
  if (value === 2) return "Level 2 — requiring substantial support";
  return "Level 3 — requiring very substantial support";
}

export interface SummaryCopy {
  headline: string;
  detail: string;
  rail: string;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function describeGaps(score: Score): string {
  const bits: string[] = [];
  if (score.c.status === "not-met") bits.push("early history is absent");
  else if (score.c.status === "incomplete") bits.push("early history is still open");
  if (score.d.status === "not-met") bits.push("impairment is absent");
  else if (score.d.status === "incomplete") bits.push("impairment is still open");
  if (bits.length === 0) return "";
  if (bits.length === 1) return `${capitalize(bits[0])}.`;
  return `${capitalize(bits[0])}, and ${bits[1]}.`;
}

function notMetReason(score: Score): string {
  if (score.a.status === "not-met") {
    return "Domain A is not met. Both patterns require all three social-communication items to be Present.";
  }
  if (score.c.status === "not-met" && score.d.status === "not-met") {
    return "Early history and clinically significant impairment are both absent.";
  }
  if (score.c.status === "not-met") return "Symptoms in the early developmental period are rated absent.";
  if (score.d.status === "not-met") return "Clinically significant impairment is rated absent in both domains.";
  return "A required part of the pattern is rated absent.";
}

export function summaryCopy(score: Score): SummaryCopy {
  const { formRule: form, fullPattern: full } = score;
  const gaps = describeGaps(score);

  if (form === "asd" && full === "asd") {
    return {
      headline: "These ratings meet the checklist pattern for autism spectrum disorder",
      detail:
        "All three social-communication items are Present, at least two restricted or repetitive items are Present, early history is Present, and impairment is Level 1 or higher. The source checklist, which uses Domains A and B, reaches the same pattern.",
      rail: "A, B, C, and D are met.",
    };
  }

  if (form === "scd" && full === "scd") {
    return {
      headline: "These ratings meet the checklist pattern for social communication disorder",
      detail:
        "All three social-communication items are Present, fewer than two restricted or repetitive items are Present, early history is Present, and impairment is Level 1 or higher. The source checklist maps an A-without-B pattern to social (pragmatic) communication disorder. The two patterns are not given together.",
      rail: "A is met, B is not, and C and D are met.",
    };
  }

  if (form === "asd" && full === "incomplete") {
    return {
      headline: "Domains A and B meet the source rule for autism spectrum disorder",
      detail: `The printed checklist marks autism spectrum disorder when A and B are met. ${gaps} The full pattern also uses early history and current impairment, so that reading stays open.`,
      rail: "A and B are met. C or D is still open.",
    };
  }

  if (form === "asd" && full === "not-met") {
    return {
      headline: "Domains A and B are met. The full pattern is not",
      detail: `The printed checklist marks autism spectrum disorder from Domains A and B alone. ${gaps} The full pattern is not met.`,
      rail: "A and B are met. C or D is absent.",
    };
  }

  if (form === "scd" && full === "incomplete") {
    return {
      headline: "Domain A is met and Domain B is not",
      detail: `That is the printed checklist's pattern for social communication disorder. ${gaps} The full pattern stays open until those ratings are settled.`,
      rail: "A without B. C or D is still open.",
    };
  }

  if (form === "scd" && full === "not-met") {
    return {
      headline: "Domain A is met, Domain B is not, and the full pattern is not met",
      detail: `The printed checklist marks social communication disorder from Domain A alone. ${gaps} The full pattern is not met.`,
      rail: "A without B. C or D is absent.",
    };
  }

  if (full === "not-met" && form === "not-met") {
    return {
      headline: "These ratings do not meet either checklist pattern",
      detail: notMetReason(score),
      rail: "A required domain is absent.",
    };
  }

  if (full === "not-met" && form === "incomplete") {
    return {
      headline: "The full pattern is not met",
      detail: `${notMetReason(score)} Some Domain A or B items are still open, so the shorter A-and-B rule is not settled.`,
      rail: "A required domain is absent. A or B is still open.",
    };
  }

  return {
    headline: "The pattern is still open",
    detail: "Only a Present rating meets an item. Unsure stays on the record as subthreshold. Rate the remaining items, then read the pattern again.",
    rail: "Only Present meets a criterion.",
  };
}

export type SectionId = "identity" | "domain-a" | "domain-b" | "domain-cd" | "specifiers" | "associated";
export type SectionFill = "empty" | "partial" | "done";

function fillOf(values: Array<unknown>): SectionFill {
  const set = values.filter((value) => value !== null && value !== "").length;
  if (set === 0) return "empty";
  if (set === values.length) return "done";
  return "partial";
}

export function sectionFill(record: ChecklistRecord, section: SectionId): SectionFill {
  if (section === "identity") {
    const values = [record.identity.name.trim(), record.identity.clinician.trim(), record.identity.date];
    return fillOf(values);
  }
  if (section === "domain-a") return fillOf(A_KEYS.map((key) => record.ratings[key]));
  if (section === "domain-b") return fillOf(B_KEYS.map((key) => record.ratings[key]));
  if (section === "domain-cd") return fillOf([record.ratings.c, record.socialSeverity, record.rrbSeverity]);
  if (section === "specifiers") return fillOf(Object.values(record.specifiers));
  return fillOf(Object.values(record.associated));
}

export function coreProgress(record: ChecklistRecord): { rated: number; total: number } {
  const keys: RatingKey[] = ["a1", "a2", "a3", "b1", "b2", "b3", "b4", "c"];
  let rated = keys.filter((key) => record.ratings[key] !== null).length;
  if (record.socialSeverity !== null) rated += 1;
  if (record.rrbSeverity !== null) rated += 1;
  return { rated, total: 10 };
}

export function shortStatus(score: Score): string {
  if (score.kind === "asd") return "ASD pattern";
  if (score.kind === "scd") return "SCD pattern";
  if (score.kind === "not-met") return "Not met";
  if (score.kind === "diverges") return "Review C and D";
  return "Open";
}

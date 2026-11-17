import { ALL_CRITERIA, ASSOCIATED, ETIOLOGY_OPTIONS, SPECIFIERS, genderLabel, languageLabel, lookupPrompt } from "./data";
import { ratingLabel, severityLabel, summaryCopy } from "./logic";
import { todayISO } from "./record";
import type { ChecklistRecord, Rating, Score, Severity, SpecifierKey } from "./types";

export interface ReportRow {
  id: string;
  code: string;
  title: string;
  value: string;
  tone: "present" | "unsure" | "absent" | "empty";
  group: string;
}

export interface NotedPrompt {
  code: string;
  text: string;
}

export interface Report {
  headline: string;
  detail: string;
  rail: string;
  decision: string[];
  rows: ReportRow[];
  prompts: NotedPrompt[];
  extras: string[];
  narrative: string;
}

function toneForRating(value: Rating | null): ReportRow["tone"] {
  if (value === "present") return "present";
  if (value === "unsure") return "unsure";
  if (value === "absent") return "absent";
  return "empty";
}

function toneForSeverity(value: Severity): ReportRow["tone"] {
  if (value === null) return "empty";
  if (value === "unsure") return "unsure";
  if (value === 0) return "absent";
  return "present";
}

function clause(status: Score["a"]["status"]): string {
  if (status === "met") return "met";
  if (status === "not-met") return "not met";
  return "open";
}

function decisionLines(record: ChecklistRecord, score: Score): string[] {
  const lines = [
    `Domain A is ${clause(score.a.status)}. ${score.a.present} of ${score.a.total} are Present. All 3 are required.`,
    `Domain B is ${clause(score.b.status)}. ${score.b.present} of ${score.b.total} are Present. At least 2 are required.`,
    `Early history is ${clause(score.c.status)}. Rating: ${ratingLabel(record.ratings.c)}.`,
    `Impairment is ${clause(score.d.status)}. Social communication: ${severityLabel(record.socialSeverity)}. Restricted and repetitive behavior: ${severityLabel(record.rrbSeverity)}.`,
  ];

  if (score.formRule === "asd") lines.push("Source-form rule: autism spectrum disorder, because Domains A and B are both met.");
  else if (score.formRule === "scd") {
    lines.push("Source-form rule: social (pragmatic) communication disorder, because Domain A is met and Domain B is not.");
  } else if (score.formRule === "not-met") lines.push("Source-form rule: neither pattern, because Domain A is not met.");
  else lines.push("Source-form rule: open, because a Domain A or B item could still change it.");

  if (score.fullPattern === "asd") lines.push("Full pattern: autism spectrum disorder, because A, B, C, and D are met.");
  else if (score.fullPattern === "scd") {
    lines.push("Full pattern: social communication disorder, because A is met, B is not, and C and D are met.");
  } else if (score.fullPattern === "not-met") {
    lines.push("Full pattern: not met. Early history, impairment, or Domain A is absent.");
  } else lines.push("Full pattern: open, until every required rating is settled.");

  lines.push(record.criterionE ? "Criterion E: marked reviewed." : "Criterion E: not marked reviewed.");
  return lines;
}

function extrasFor(record: ChecklistRecord, score: Score): string[] {
  const extras: string[] = [];
  if (record.specifiers.intellectual === "present") {
    extras.push(
      "Intellectual disability is rated Present. Autism spectrum disorder requires that social communication be below what the person's developmental level would account for.",
    );
  }
  if (record.specifiers.intellectual === "present" && !record.criterionE) {
    extras.push("Criterion E has not been marked reviewed.");
  }
  if (record.specifiers.language === "present" && !record.language) {
    extras.push("Language impairment is rated Present. The language level is still unselected.");
  }
  if (score.d.status === "met" && record.socialSeverity === 0 && (score.formRule === "asd" || score.formRule === "scd")) {
    extras.push(
      "Social-communication severity is rated as no clinically significant impairment. Confirm that Level before relying on a social-communication pattern.",
    );
  }
  if (score.d.status === "met" && record.rrbSeverity === 0 && score.formRule === "asd" && score.b.status === "met") {
    extras.push(
      "Restricted and repetitive behavior meets the symptom count, and its severity is rated as no clinically significant impairment. Confirm that Level rating.",
    );
  }
  return extras;
}

function specifierValue(record: ChecklistRecord, id: SpecifierKey): string {
  const rating = ratingLabel(record.specifiers[id]);
  if (id === "language" && record.language && record.specifiers.language !== "absent") {
    return `${rating} — ${languageLabel(record.language)}`;
  }
  if (id === "etiology" && record.specifiers.etiology !== "absent" && (record.etiology.length || record.etiologyDetail.trim())) {
    const kinds = ETIOLOGY_OPTIONS.filter((item) => record.etiology.includes(item.id)).map((item) => item.label);
    const detail = record.etiologyDetail.trim();
    const extra = [kinds.join(", "), detail].filter(Boolean).join(". ");
    return extra ? `${rating} — ${extra}` : rating;
  }
  if (id === "other" && record.otherDetail.trim() && record.specifiers.other !== "absent") {
    return `${rating} — ${record.otherDetail.trim()}`;
  }
  return rating;
}

function notedPrompts(record: ChecklistRecord): NotedPrompt[] {
  const prompts: NotedPrompt[] = [];
  for (const ids of Object.values(record.prompts)) {
    for (const id of ids) {
      const found = lookupPrompt(id);
      if (found) prompts.push(found);
    }
  }
  return prompts;
}

export function downloadBaseName(record: ChecklistRecord): string {
  const date = record.identity.date || todayISO();
  const slug =
    record.identity.name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "untitled";
  return `checklist-${date}-${slug}`;
}

export function buildReport(record: ChecklistRecord, score: Score): Report {
  const copy = summaryCopy(score);
  const decision = decisionLines(record, score);
  const rows: ReportRow[] = ALL_CRITERIA.map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    value: ratingLabel(record.ratings[item.id]),
    tone: toneForRating(record.ratings[item.id]),
    group: item.id.startsWith("a") ? "A · Social communication" : item.id.startsWith("b") ? "B · Restricted and repetitive" : "C · Early history",
  }));
  rows.push(
    {
      id: "dSocial",
      code: "D1",
      title: "Social-communication severity",
      value: severityLabel(record.socialSeverity),
      tone: toneForSeverity(record.socialSeverity),
      group: "D · Impairment",
    },
    {
      id: "dRrb",
      code: "D2",
      title: "Restricted and repetitive severity",
      value: severityLabel(record.rrbSeverity),
      tone: toneForSeverity(record.rrbSeverity),
      group: "D · Impairment",
    },
  );

  for (const item of SPECIFIERS) {
    rows.push({
      id: item.id,
      code: "S",
      title: item.title,
      value: specifierValue(record, item.id),
      tone: toneForRating(record.specifiers[item.id]),
      group: "Specifiers",
    });
  }
  for (const item of ASSOCIATED) {
    rows.push({
      id: item.id,
      code: "F",
      title: item.title,
      value: ratingLabel(record.associated[item.id]),
      tone: toneForRating(record.associated[item.id]),
      group: "Associated features",
    });
  }

  const prompts = notedPrompts(record);
  const extras = extrasFor(record, score);
  const narrative = narrativeFor(record, copy, decision, rows, prompts, extras);
  return { headline: copy.headline, detail: copy.detail, rail: copy.rail, decision, rows, prompts, extras, narrative };
}

function narrativeFor(
  record: ChecklistRecord,
  copy: { headline: string; detail: string },
  decision: string[],
  rows: ReportRow[],
  prompts: NotedPrompt[],
  extras: string[],
): string {
  const identity = record.identity;
  const lines = [
    "DSM-5 AUTISM SPECTRUM DISORDER",
    "DIAGNOSTIC SYMPTOM CHECKLIST",
    "Clinician worksheet. A diagnosis is made by a qualified clinician who knows the person.",
    "Ratings in this file were entered in the browser. Nothing was uploaded to build this file.",
    "",
    `Name: ${identity.name.trim()}`,
    `Age: ${identity.age.trim() ? `${identity.age.trim()} years` : ""}`,
    `Gender: ${genderLabel(identity.gender)}`,
    `Clinician: ${identity.clinician.trim()}`,
    `Date: ${identity.date}`,
    "",
    "READING",
    copy.headline,
    copy.detail,
    "",
    "HOW THIS WAS DECIDED",
    ...decision.map((line, index) => `${index + 1}. ${line}`),
    "",
    "RATINGS",
  ];

  let group = "";
  for (const row of rows) {
    if (row.group !== group) {
      group = row.group;
      lines.push("", group);
    }
    lines.push(`${row.code}  ${row.title} — ${row.value}`);
  }

  lines.push("", "PROMPTS NOTED");
  if (prompts.length === 0) lines.push("None.");
  else prompts.forEach((prompt) => lines.push(`${prompt.code}  ${prompt.text}`));

  if (extras.length) {
    lines.push("", "REVIEW BEFORE YOU RELY ON THE PATTERN");
    extras.forEach((extra) => lines.push(`- ${extra}`));
  }

  lines.push("", "CLINICAL NOTE");
  lines.push(record.note.trim() || "None.");
  lines.push(
    "",
    "Rules",
    "- Domain A requires all 3 items Present.",
    "- Domain B requires at least 2 items Present.",
    "- Only Present (full, 3) meets an item. Unsure / subthreshold stays on the record and does not meet the item.",
    "- The source checklist marks autism spectrum disorder when A and B are met, and social communication disorder when only A is met.",
    "- The full DSM-5 pattern also requires early history (C) and clinically significant impairment (D, Level 1 or higher).",
    "",
    "The paper form this worksheet follows reported diagnostic correspondence of 95% with the Social Responsiveness Scale and 86% with the ADOS. Those figures belong to that comparison. They are not a result of the ratings in this file.",
  );
  return lines.join("\n");
}

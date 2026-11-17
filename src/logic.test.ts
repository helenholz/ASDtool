import { describe, expect, it } from "vitest";
import { buildReport, downloadBaseName } from "./report";
import { emptyRecord } from "./record";
import { coreProgress, scoreRecord, shortStatus, summaryCopy } from "./logic";
import { asAge, reducer } from "./state";
import type { ChecklistRecord, Rating, RatingKey, Severity } from "./types";

function rated(
  ratings: Partial<Record<RatingKey, Rating | null>>,
  social: Severity = null,
  rrb: Severity = null,
): ChecklistRecord {
  const record = emptyRecord();
  record.ratings = { ...record.ratings, ...ratings };
  record.socialSeverity = social;
  record.rrbSeverity = rrb;
  return record;
}

describe("scoring", () => {
  it("starts open", () => {
    const score = scoreRecord(emptyRecord());
    expect(score.formRule).toBe("incomplete");
    expect(score.fullPattern).toBe("incomplete");
    expect(score.kind).toBe("open");
    expect(summaryCopy(score).headline).toBe("The pattern is still open");
    expect(shortStatus(score)).toBe("Open");
  });

  it("meets the autism spectrum pattern when A, B, C, and D are met", () => {
    const record = rated(
      { a1: "present", a2: "present", a3: "present", b1: "present", b2: "present", b3: "absent", b4: "absent", c: "present" },
      1,
      1,
    );
    const score = scoreRecord(record);
    expect(score.a.status).toBe("met");
    expect(score.b.status).toBe("met");
    expect(score.c.status).toBe("met");
    expect(score.d.status).toBe("met");
    expect(score.formRule).toBe("asd");
    expect(score.fullPattern).toBe("asd");
    expect(summaryCopy(score).headline).toContain("autism spectrum disorder");
    const report = buildReport(record, score);
    expect(report.decision[0]).toBe("Domain A is met. 3 of 3 are Present. All 3 are required.");
    expect(report.decision[5]).toBe("Full pattern: autism spectrum disorder, because A, B, C, and D are met.");
  });

  it("maps A without B to social communication disorder when C and D are met", () => {
    const score = scoreRecord(
      rated(
        { a1: "present", a2: "present", a3: "present", b1: "absent", b2: "absent", b3: "absent", b4: "absent", c: "present" },
        2,
        0,
      ),
    );
    expect(score.formRule).toBe("scd");
    expect(score.fullPattern).toBe("scd");
    expect(score.kind).toBe("scd");
  });

  it("does not let subthreshold meet a criterion", () => {
    const score = scoreRecord(
      rated({ a1: "present", a2: "present", a3: "unsure", b1: "present", b2: "present", c: "present" }, 1, 1),
    );
    expect(score.a.status).toBe("incomplete");
    expect(score.formRule).toBe("incomplete");
    expect(score.fullPattern).toBe("incomplete");
    expect(score.subthreshold).toContain("a3");
  });

  it("fails Domain A when one item is absent", () => {
    const score = scoreRecord(rated({ a1: "present", a2: "present", a3: "absent", b1: "present", b2: "present", b3: "present", b4: "present", c: "present" }, 3, 3));
    expect(score.a.status).toBe("not-met");
    expect(score.formRule).toBe("not-met");
    expect(score.fullPattern).toBe("not-met");
    expect(summaryCopy(score).detail).toContain("Domain A is not met");
  });

  it("treats two Present B items as enough, even if the others are blank", () => {
    const score = scoreRecord(rated({ b1: "present", b2: "present" }));
    expect(score.b.status).toBe("met");
  });

  it("keeps Domain B open when one more Present rating could meet it", () => {
    const score = scoreRecord(rated({ b1: "present", b2: "unsure", b3: "absent", b4: "absent" }));
    expect(score.b.status).toBe("incomplete");
  });

  it("marks Domain B not met when the remaining items cannot reach two", () => {
    const score = scoreRecord(rated({ b1: "present", b2: "absent", b3: "absent", b4: "absent" }));
    expect(score.b.status).toBe("not-met");
  });

  it("diverges when A and B are met and early history is absent", () => {
    const score = scoreRecord(
      rated(
        { a1: "present", a2: "present", a3: "present", b1: "present", b2: "present", c: "absent" },
        1,
        1,
      ),
    );
    expect(score.formRule).toBe("asd");
    expect(score.fullPattern).toBe("not-met");
    expect(score.kind).toBe("diverges");
    expect(summaryCopy(score).detail).toContain("Early history is absent.");
  });

  it("keeps the full pattern open when impairment is unrated", () => {
    const score = scoreRecord(
      rated({ a1: "present", a2: "present", a3: "present", b1: "present", b4: "present", c: "present" }, null, null),
    );
    expect(score.formRule).toBe("asd");
    expect(score.fullPattern).toBe("incomplete");
    expect(summaryCopy(score).rail).toContain("C or D is still open");
  });

  it("does not meet impairment when both severities are zero", () => {
    const score = scoreRecord(rated({ c: "present" }, 0, 0));
    expect(score.d.status).toBe("not-met");
    expect(score.c.status).toBe("met");
  });

  it("keeps impairment open when one severity is unsure", () => {
    const score = scoreRecord(rated({}, "unsure", 2));
    expect(score.d.status).toBe("incomplete");
  });

  it("counts core ratings without treating them as a total score", () => {
    const record = rated({ a1: "present", a2: "absent" }, 0, null);
    expect(coreProgress(record)).toEqual({ rated: 3, total: 10 });
  });

  it("names an intellectual-disability review note", () => {
    const record = rated(
      { a1: "present", a2: "present", a3: "present", b1: "present", b2: "present", c: "present" },
      1,
      1,
    );
    record.specifiers.intellectual = "present";
    const report = buildReport(record, scoreRecord(record));
    expect(report.extras.some((line) => line.includes("developmental level"))).toBe(true);
    expect(report.extras.some((line) => line.includes("Criterion E"))).toBe(true);
  });
});

describe("record editing", () => {
  it("clears a rating when the same value is chosen again", () => {
    const once = reducer(emptyRecord(), { type: "rating", key: "a1", value: "present" });
    expect(once.ratings.a1).toBe("present");
    const twice = reducer(once, { type: "rating", key: "a1", value: "present" });
    expect(twice.ratings.a1).toBeNull();
  });

  it("toggles a prompt on and off", () => {
    const on = reducer(emptyRecord(), { type: "prompt", criterionId: "a1", promptId: "a1-1" });
    expect(on.prompts.a1).toEqual(["a1-1"]);
    const off = reducer(on, { type: "prompt", criterionId: "a1", promptId: "a1-1" });
    expect(off.prompts.a1).toEqual([]);
  });

  it("keeps the person's name when ratings are cleared", () => {
    const named = reducer(emptyRecord(), { type: "identity", field: "name", value: "River" });
    const ratedOnce = reducer(named, { type: "rating", key: "b4", value: "present" });
    const cleared = reducer(ratedOnce, { type: "clear-ratings" });
    expect(cleared.identity.name).toBe("River");
    expect(cleared.ratings.b4).toBeNull();
    expect(cleared.id).toBe(named.id);
  });

  it("starts a new checklist only after the current one has content", () => {
    const blank = emptyRecord();
    expect(reducer(blank, { type: "new" }).id).toBe(blank.id);
    const named = reducer(blank, { type: "identity", field: "clinician", value: "A. Chen" });
    expect(reducer(named, { type: "new" }).id).not.toBe(blank.id);
  });

  it("keeps a single decimal place in age", () => {
    expect(asAge("8 years")).toBe("8");
    expect(asAge("4.58")).toBe("4.5");
  });

  it("builds a filename that cannot carry a path", () => {
    const record = emptyRecord();
    record.identity.name = "A/B ../x";
    record.identity.date = "2026-01-02";
    expect(downloadBaseName(record)).toBe("checklist-2026-01-02-a-b-x");
  });
});

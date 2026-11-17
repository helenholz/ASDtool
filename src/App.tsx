import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { ASSOCIATED, CRITERION_C, DOMAIN_A, DOMAIN_B, ETIOLOGY_OPTIONS, GENDERS, LANGUAGE_LEVEL_OPTIONS, RRB_LEVELS, SOCIAL_LEVELS, SPECIFIERS, genderLabel } from "./data";
import { CriterionCard, Field, RecordsDialog, Scale, cx } from "./components";
import { A_KEYS, B_KEYS } from "./types";
import type { ChecklistRecord, RatingKey, Severity, SeverityChoice } from "./types";
import { coreProgress, scoreRecord, sectionFill, shortStatus, statusLabel, summaryCopy } from "./logic";
import { buildReport, downloadBaseName } from "./report";
import { isPristine, todayISO } from "./record";
import { loadInitial, persist, removeRecord } from "./storage";
import { reducer } from "./state";

const SECTIONS = ["identity", "domain-a", "domain-b", "domain-cd", "specifiers", "associated", "summary"] as const;

const JUMPS: Array<{ id: (typeof SECTIONS)[number]; label: string; fill?: Parameters<typeof sectionFill>[1] }> = [
  { id: "identity", label: "Person", fill: "identity" },
  { id: "domain-a", label: "A · Social", fill: "domain-a" },
  { id: "domain-b", label: "B · Restricted", fill: "domain-b" },
  { id: "domain-cd", label: "C · D", fill: "domain-cd" },
  { id: "specifiers", label: "Specifiers", fill: "specifiers" },
  { id: "associated", label: "Features", fill: "associated" },
  { id: "summary", label: "Reading" },
];

function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? "identity");
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-12% 0px -58% 0px", threshold: [0.1, 0.3, 0.6] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function choiceFromSeverity(value: Severity): SeverityChoice | null {
  if (value === null) return null;
  if (value === "unsure") return "unsure";
  return String(value) as SeverityChoice;
}

function severityFromChoice(value: SeverityChoice): Severity {
  if (value === "unsure") return "unsure";
  return Number(value) as 0 | 1 | 2 | 3;
}

const SEVERITY_HOTKEYS: Record<string, SeverityChoice> = { u: "unsure", "0": "0", "1": "1", "2": "2", "3": "3" };

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Pips({ keys, ratings }: { keys: readonly RatingKey[]; ratings: ChecklistRecord["ratings"] }) {
  return (
    <span className="pips" aria-hidden="true">
      {keys.map((key) => (
        <i key={key} className={`pip pip-${ratings[key] ?? "empty"}`} />
      ))}
    </span>
  );
}

export function App() {
  const [record, dispatch] = useReducer(reducer, undefined, loadInitial);
  const [records, setRecords] = useState<ChecklistRecord[]>([]);
  const [persistent, setPersistent] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const active = useActiveSection(SECTIONS);

  useEffect(() => {
    const saved = persist(record);
    setRecords(saved.records);
    setPersistent(saved.persistent);
  }, [record]);

  const score = useMemo(() => scoreRecord(record), [record]);
  const report = useMemo(() => buildReport(record, score), [record, score]);
  const progress = useMemo(() => coreProgress(record), [record]);
  const copy = summaryCopy(score);
  const libraryCount = records.filter((item) => !isPristine(item)).length;

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  function onNew() {
    if (!persistent && !isPristine(record)) {
      const ok = window.confirm("This browser is not storing checklists. Starting a new one clears the ratings on this page. Continue?");
      if (!ok) return;
    }
    dispatch({ type: "new" });
    window.scrollTo({ top: 0 });
    window.setTimeout(() => document.getElementById("person-name")?.focus(), 0);
  }

  function onOpen(id: string) {
    const next = records.find((item) => item.id === id);
    if (!next) return;
    dispatch({ type: "load", record: next });
    closeDialog();
    window.scrollTo({ top: 0 });
  }

  function onDelete(id: string) {
    const name = records.find((item) => item.id === id)?.identity.name.trim() || "this checklist";
    const ok = window.confirm(`Delete ${name} from this browser?`);
    if (!ok) return;
    const result = removeRecord(id, record);
    setRecords(result.records);
    setPersistent(result.persistent);
    if (result.next) dispatch({ type: "load", record: result.next });
  }

  function downloadText() {
    saveBlob(new Blob([report.narrative], { type: "text/plain;charset=utf-8" }), `${downloadBaseName(record)}.txt`);
  }

  function downloadJson() {
    const payload = { format: "asd-checklist-v1", exportedAt: new Date().toISOString(), record };
    saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${downloadBaseName(record)}.json`);
  }

  const groups = report.rows.reduce<string[]>((list, row) => {
    if (!list.includes(row.group)) list.push(row.group);
    return list;
  }, []);

  return (
    <>
      <a className="skip" href="#main">
        Skip to checklist
      </a>
      <div className="sheet">
        <header className="letterhead">
          <div className="mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="48" height="48">
              <rect x="1" y="1" width="46" height="46" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 16h24M12 24h24M12 32h14" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 16l0 0" stroke="currentColor" />
              <circle cx="14" cy="16" r="1.3" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="kicker">Interactive clinician worksheet</p>
            <h1>Autism spectrum disorder diagnostic symptom checklist</h1>
            <p className="dek">DSM-5 structured ratings for social communication, restricted and repetitive behavior, early history, and impairment.</p>
          </div>
          <div className="letterhead-actions noprint">
            <p className={cx("saved", !persistent && "warn")}>{persistent ? "Saved on this device" : "Not stored in this browser"}</p>
            <button type="button" onClick={() => setDialogOpen(true)}>
              Saved checklists{libraryCount ? ` (${libraryCount})` : ""}
            </button>
            <button type="button" className="ghost" onClick={onNew}>
              New checklist
            </button>
          </div>
        </header>

        <nav className="jumps noprint" aria-label="Checklist sections">
          {JUMPS.map((jump) => {
            const fill = jump.fill ? sectionFill(record, jump.fill) : undefined;
            return (
              <a key={jump.id} href={`#${jump.id}`} aria-current={active === jump.id ? "true" : undefined}>
                {fill ? <i className={cx("dot", fill)} /> : null}
                {jump.label}
              </a>
            );
          })}
        </nav>
        <div
          className="progress noprint"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.rated}
          aria-label="Core ratings entered"
        >
          <span style={{ width: `${(progress.rated / progress.total) * 100}%` }} />
        </div>

        <div className="layout">
          <main id="main">
            <section id="identity" className="section">
              <div className="section-head">
                <p className="kicker">Before you rate</p>
                <h2>Person and sources</h2>
              </div>
              <div className="guidelines">
                <ol>
                  <li>Incorporate information from clinical observation and all available sources.</li>
                  <li>Offer the suggested prompts to elicit features of concern.</li>
                </ol>
                <p>The name and the ratings stay in this browser. Nothing on this page is uploaded.</p>
              </div>
              <div className="fields">
                <Field id="person-name" label="Name" className="wide">
                  <input
                    id="person-name"
                    value={record.identity.name}
                    autoComplete="off"
                    maxLength={120}
                    onChange={(event) => dispatch({ type: "identity", field: "name", value: event.target.value })}
                  />
                </Field>
                <Field id="person-age" label="Age in years">
                  <input
                    id="person-age"
                    inputMode="decimal"
                    value={record.identity.age}
                    autoComplete="off"
                    onChange={(event) => dispatch({ type: "identity", field: "age", value: event.target.value })}
                  />
                </Field>
                <Field id="person-gender" label="Gender">
                  <select
                    id="person-gender"
                    value={record.identity.gender}
                    onChange={(event) => dispatch({ type: "identity", field: "gender", value: event.target.value })}
                  >
                    {GENDERS.map((option) => (
                      <option key={option.value || "blank"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="clinician" label="Clinician">
                  <input
                    id="clinician"
                    value={record.identity.clinician}
                    autoComplete="name"
                    maxLength={120}
                    onChange={(event) => dispatch({ type: "identity", field: "clinician", value: event.target.value })}
                  />
                </Field>
                <Field id="visit-date" label="Date">
                  <div className="date-row">
                    <input
                      id="visit-date"
                      type="date"
                      value={record.identity.date}
                      onChange={(event) => dispatch({ type: "identity", field: "date", value: event.target.value })}
                    />
                    <button type="button" className="text-btn" onClick={() => dispatch({ type: "identity", field: "date", value: todayISO() })}>
                      Today
                    </button>
                  </div>
                </Field>
              </div>
            </section>

            <section className="section legend-section noprint">
              <h2 className="legend-title">How to rate</h2>
              <ul className="legend">
                <li>
                  <strong>Absent · 1</strong> The feature is not present.
                </li>
                <li>
                  <strong>Unsure · 2</strong> Subthreshold or unclear. It stays on the record and does not meet the item.
                </li>
                <li>
                  <strong>Present · 3</strong> The feature is fully present, now or by history.
                </li>
              </ul>
              <p className="hint">Choose a rating again to clear it. With a row focused, keys 1, 2, and 3 set Absent, Unsure, and Present.</p>
            </section>

            <section id="domain-a" className="section">
              <div className="section-head">
                <p className="kicker">Domain A · Lifetime history</p>
                <h2>Social communication and interaction</h2>
                <p>All three are required. A pattern needs every item rated Present.</p>
                <span className={`badge badge-${score.a.status}`}>{statusLabel(score.a.status)} · {score.a.present}/3</span>
              </div>
              {DOMAIN_A.map((item) => (
                <CriterionCard key={item.id} item={item} rating={record.ratings[item.id]} noted={record.prompts[item.id] ?? []} dispatch={dispatch} />
              ))}
            </section>

            <section id="domain-b" className="section">
              <div className="section-head">
                <p className="kicker">Domain B · Lifetime history</p>
                <h2>Restricted, repetitive behavior</h2>
                <p>At least two of the four are required.</p>
                <span className={`badge badge-${score.b.status}`}>{statusLabel(score.b.status)} · {score.b.present}/4</span>
              </div>
              {DOMAIN_B.map((item) => (
                <CriterionCard key={item.id} item={item} rating={record.ratings[item.id]} noted={record.prompts[item.id] ?? []} dispatch={dispatch} />
              ))}
            </section>

            <section id="domain-cd" className="section">
              <div className="section-head">
                <p className="kicker">Domain C</p>
                <h2>Early developmental period</h2>
                <p>Rate Present when symptoms were there early, even if they became obvious only when demands increased, or were masked later.</p>
                <span className={`badge badge-${score.c.status}`}>{statusLabel(score.c.status)}</span>
              </div>
              <CriterionCard item={CRITERION_C} rating={record.ratings.c} noted={record.prompts.c ?? []} dispatch={dispatch} />

              <div className="section-head follow">
                <p className="kicker">Domain D · Current functioning</p>
                <h2>Clinically significant impairment</h2>
                <p>Level 1 or higher in either area is clinically significant impairment. Rate both areas. Keys 0–3 set the level, and U sets Unsure, when a list is focused.</p>
                <span className={`badge badge-${score.d.status}`}>{statusLabel(score.d.status)}</span>
              </div>
              <div className="severity-grid">
                <div>
                  <h3>Social communication</h3>
                  <Scale
                    variant="stack"
                    label="Social communication severity"
                    value={choiceFromSeverity(record.socialSeverity)}
                    options={SOCIAL_LEVELS}
                    hotkeys={SEVERITY_HOTKEYS}
                    onChange={(value) => dispatch({ type: "severity", which: "social", value: severityFromChoice(value) })}
                  />
                </div>
                <div>
                  <h3>Restricted and repetitive behavior</h3>
                  <Scale
                    variant="stack"
                    label="Restricted and repetitive behavior severity"
                    value={choiceFromSeverity(record.rrbSeverity)}
                    options={RRB_LEVELS}
                    hotkeys={SEVERITY_HOTKEYS}
                    onChange={(value) => dispatch({ type: "severity", which: "rrb", value: severityFromChoice(value) })}
                  />
                </div>
              </div>
            </section>

            <section id="specifiers" className="section">
              <div className="section-head">
                <p className="kicker">Qualifiers</p>
                <h2>Specifiers</h2>
                <p>Specifiers describe a pattern. They do not create one.</p>
              </div>
              {SPECIFIERS.map((item) => (
                <article key={item.id} className="criterion" data-rating={record.specifiers[item.id] ?? "empty"}>
                  <header className="criterion-head">
                    <span className="code">S</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </header>
                  <Scale
                    label={item.title}
                    value={record.specifiers[item.id]}
                    options={[
                      { value: "absent", label: "Absent", hint: "No · 1" },
                      { value: "unsure", label: "Unsure", hint: "Subthreshold · 2" },
                      { value: "present", label: "Present", hint: "Full · 3" },
                    ]}
                    hotkeys={{ "1": "absent", "2": "unsure", "3": "present" }}
                    onChange={(value) => dispatch({ type: "specifier", key: item.id, value })}
                  />
                  {item.id === "language" && record.specifiers.language !== "absent" && record.specifiers.language !== null ? (
                    <div className="subpanel">
                      <p>Language level</p>
                      <div className="chips">
                        {LANGUAGE_LEVEL_OPTIONS.map((level) => (
                          <button
                            key={level.id}
                            type="button"
                            aria-pressed={record.language === level.id}
                            className={cx("chip", record.language === level.id && "on")}
                            onClick={() => dispatch({ type: "language", value: level.id })}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {item.id === "etiology" && record.specifiers.etiology !== "absent" && record.specifiers.etiology !== null ? (
                    <div className="subpanel">
                      <div className="chips">
                        {ETIOLOGY_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={record.etiology.includes(option.id)}
                            className={cx("chip", record.etiology.includes(option.id) && "on")}
                            onClick={() => dispatch({ type: "etiology", key: option.id })}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <label className="stack-label" htmlFor="etiology-detail">
                        Detail
                        <input
                          id="etiology-detail"
                          value={record.etiologyDetail}
                          maxLength={300}
                          onChange={(event) => dispatch({ type: "etiologyDetail", value: event.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}
                  {item.id === "other" && record.specifiers.other !== "absent" && record.specifiers.other !== null ? (
                    <div className="subpanel">
                      <label className="stack-label" htmlFor="other-detail">
                        Name the condition
                        <input
                          id="other-detail"
                          value={record.otherDetail}
                          maxLength={300}
                          onChange={(event) => dispatch({ type: "otherDetail", value: event.target.value })}
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>

            <section id="associated" className="section">
              <div className="section-head">
                <p className="kicker">Alongside the pattern</p>
                <h2>Associated features</h2>
                <p>These are recorded with the pattern. They are outside the A–D count.</p>
              </div>
              {ASSOCIATED.map((item) => (
                <article key={item.id} className="criterion" data-rating={record.associated[item.id] ?? "empty"}>
                  <header className="criterion-head">
                    <span className="code">F</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                  </header>
                  <Scale
                    label={item.title}
                    value={record.associated[item.id]}
                    options={[
                      { value: "absent", label: "Absent", hint: "No · 1" },
                      { value: "unsure", label: "Unsure", hint: "Subthreshold · 2" },
                      { value: "present", label: "Present", hint: "Full · 3" },
                    ]}
                    hotkeys={{ "1": "absent", "2": "unsure", "3": "present" }}
                    onChange={(value) => dispatch({ type: "associated", key: item.id, value })}
                  />
                </article>
              ))}
            </section>

            <section id="summary" className="section">
              <div className="section-head">
                <p className="kicker">Clinical note</p>
                <h2>Note, criterion E, and the reading</h2>
              </div>
              <label className="stack-label" htmlFor="clinical-note">
                Clinical note
                <textarea
                  id="clinical-note"
                  rows={5}
                  maxLength={4000}
                  value={record.note}
                  placeholder="Observations, sources, and anything the ratings do not capture."
                  onChange={(event) => dispatch({ type: "note", value: event.target.value })}
                />
              </label>
              <label className="checkline">
                <input
                  type="checkbox"
                  checked={record.criterionE}
                  onChange={(event) => dispatch({ type: "criterionE", value: event.target.checked })}
                />
                <span>
                  Criterion E reviewed. Social communication was considered against developmental level, including whether intellectual disability or global developmental delay would account for it.
                </span>
              </label>

              <div className={`result result-${score.kind}`} aria-live="polite">
                <p className="result-kicker">{shortStatus(score)}</p>
                <p className="result-for">
                  {record.identity.name.trim() || "Name not recorded"}
                  {record.identity.age.trim() ? ` · ${record.identity.age.trim()} years` : ""}
                  {record.identity.gender ? ` · ${genderLabel(record.identity.gender)}` : ""}
                </p>
                <h2>{copy.headline}</h2>
                <p className="detail">{copy.detail}</p>
                <p className="disclaimer">A diagnosis is made by a qualified clinician who knows the person. This reading applies the checklist rules to the ratings above.</p>

                <h3>How this was decided</h3>
                <ol className="decision">
                  {report.decision.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>

                {report.extras.length > 0 ? (
                  <div className="extras">
                    <h3>Review before you rely on this pattern</h3>
                    <ul>
                      {report.extras.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {groups.map((group) => (
                  <div key={group} className="group">
                    <h3>{group}</h3>
                    <ul>
                      {report.rows
                        .filter((row) => row.group === group)
                        .map((row) => (
                          <li key={row.id}>
                            <span className="code">{row.code}</span>
                            <span className="row-title">{row.title}</span>
                            <span className={`value tone-${row.tone}`}>{row.value}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}

                {report.prompts.length > 0 ? (
                  <div className="group">
                    <h3>Prompts noted</h3>
                    <ul className="plain">
                      {report.prompts.map((prompt) => (
                        <li key={`${prompt.code}-${prompt.text}`}>
                          <span className="code">{prompt.code}</span>
                          <span>{prompt.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="signoff">
                  <span>Clinician: {record.identity.clinician.trim() || "____________________"}</span>
                  <span>Date: {record.identity.date || "____________________"}</span>
                </p>
              </div>

              <div className="actions noprint">
                <button type="button" onClick={() => window.print()}>
                  Print
                </button>
                <button type="button" onClick={downloadText}>
                  Download text
                </button>
                <button type="button" className="ghost" onClick={downloadJson}>
                  Download JSON
                </button>
                {confirmClear ? (
                  <span className="confirm-clear">
                    Clear every rating on this checklist?
                    <button type="button" className="text-btn danger" onClick={() => { dispatch({ type: "clear-ratings" }); setConfirmClear(false); }}>
                      Clear ratings
                    </button>
                    <button type="button" className="text-btn" onClick={() => setConfirmClear(false)}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button type="button" className="text-btn" onClick={() => setConfirmClear(true)}>
                    Clear ratings
                  </button>
                )}
              </div>
              <p className="footnote">
                The paper checklist this worksheet follows reported diagnostic correspondence of 95% with the Social Responsiveness Scale and 86% with the ADOS. Those figures describe that comparison. They are not recalculated from the ratings entered here.
              </p>
            </section>
          </main>

          <aside className="rail noprint" aria-label="Live pattern">
            <p className="kicker">Pattern</p>
            <p className={`rail-status rail-${score.kind}`}>{shortStatus(score)}</p>
            <p className="rail-line">{copy.rail}</p>
            <div className="meter">
              <span>A</span>
              <Pips keys={A_KEYS} ratings={record.ratings} />
              <span>{score.a.present}/3 · {statusLabel(score.a.status)}</span>
            </div>
            <div className="meter">
              <span>B</span>
              <Pips keys={B_KEYS} ratings={record.ratings} />
              <span>{score.b.present}/4 · {statusLabel(score.b.status)}</span>
            </div>
            <div className="meter">
              <span>C</span>
              <span className={`mini badge-${score.c.status}`}>{statusLabel(score.c.status)}</span>
            </div>
            <div className="meter">
              <span>D</span>
              <span className={`mini badge-${score.d.status}`}>{statusLabel(score.d.status)}</span>
            </div>
            <p className="rail-progress">{progress.rated} of {progress.total} core ratings</p>
            <a className="rail-jump" href="#summary">
              Open the full reading
            </a>
            <details className="rail-rules">
              <summary>How a pattern is met</summary>
              <ul>
                <li>Domain A needs all three items Present.</li>
                <li>Domain B needs at least two items Present.</li>
                <li>Unsure is subthreshold. It stays on the record and does not meet the item.</li>
                <li>The source form marks autism spectrum disorder when A and B are met, and social communication disorder when only A is met.</li>
                <li>The full pattern also requires early history and impairment at Level 1 or higher.</li>
              </ul>
            </details>
          </aside>
        </div>

        <footer className="colophon">
          <p>
            Structured as an interactive worksheet after the MGH Autism Spectrum Disorder DSM-5 Diagnostic Symptom Checklist. Independent implementation. Not published by Massachusetts General Hospital or the American Psychiatric Association.
          </p>
          <p>DSM-5 criteria and severity levels are those of the American Psychiatric Association. Use this page with the person in front of you, not as the only basis for a clinical decision.</p>
        </footer>
      </div>

      <div className="mobile-bar noprint">
        <div>
          <strong>{shortStatus(score)}</strong>
          <span>
            A {score.a.present}/3 · B {score.b.present}/4 · {progress.rated}/10
          </span>
        </div>
        <a href="#summary">Reading</a>
      </div>

      {dialogOpen ? (
        <RecordsDialog records={records} currentId={record.id} onOpen={onOpen} onDelete={onDelete} onClose={closeDialog} />
      ) : null}
    </>
  );
}

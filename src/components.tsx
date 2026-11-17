import { useEffect, useRef } from "react";
import type { Dispatch, KeyboardEvent, ReactNode } from "react";
import type { CriterionItem } from "./data";
import { coreProgress, scoreRecord, shortStatus } from "./logic";
import { isPristine } from "./record";
import type { Action } from "./state";
import type { ChecklistRecord, Rating } from "./types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

interface ScaleOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  text?: string;
}

export function Scale<T extends string>({
  label,
  value,
  options,
  onChange,
  hotkeys,
  variant = "row",
}: {
  label: string;
  value: T | null;
  options: ScaleOption<T>[];
  onChange: (value: T) => void;
  hotkeys?: Record<string, T>;
  variant?: "row" | "stack";
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function select(next: T, index: number) {
    onChange(next);
    refs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const hotkey = hotkeys?.[event.key.toLowerCase()];
    if (hotkey) {
      event.preventDefault();
      const index = options.findIndex((option) => option.value === hotkey);
      if (index >= 0) select(hotkey, index);
      return;
    }
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const current = options.findIndex((option) => option.value === value);
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const index = current === -1
      ? direction === 1 ? 0 : options.length - 1
      : (current + direction + options.length) % options.length;
    select(options[index].value, index);
  }

  return (
    <div role="radiogroup" aria-label={label} className={variant === "row" ? "scale" : "levels"} onKeyDown={onKeyDown}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (value == null && index === 0) ? 0 : -1}
            data-value={option.value}
            className={variant === "stack" ? "level" : "scale-btn"}
            onClick={() => onChange(option.value)}
          >
            <span className="scale-label">{option.label}</span>
            {option.hint ? <span className="scale-hint">{option.hint}</span> : null}
            {variant === "stack" && option.text ? <span className="scale-text">{option.text}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

const RATING_OPTIONS: Array<{ value: Rating; label: string; hint: string }> = [
  { value: "absent", label: "Absent", hint: "No · 1" },
  { value: "unsure", label: "Unsure", hint: "Subthreshold · 2" },
  { value: "present", label: "Present", hint: "Full · 3" },
];

const RATING_HOTKEYS: Record<string, Rating> = { "1": "absent", "2": "unsure", "3": "present" };

export function CriterionCard({
  item,
  rating,
  noted,
  dispatch,
}: {
  item: CriterionItem;
  rating: Rating | null;
  noted: string[];
  dispatch: Dispatch<Action>;
}) {
  const notedCount = item.prompts.filter((prompt) => noted.includes(prompt.id)).length;
  return (
    <article className="criterion" data-rating={rating ?? "empty"}>
      <header className="criterion-head">
        <span className="code">{item.code}</span>
        <div>
          <h3>{item.title}</h3>
          <p>{item.lead}</p>
        </div>
      </header>
      <Scale
        label={`${item.code}. ${item.title}`}
        value={rating}
        options={RATING_OPTIONS}
        hotkeys={RATING_HOTKEYS}
        onChange={(value) => dispatch({ type: "rating", key: item.id, value })}
      />
      <details className="prompts">
        <summary>
          <span>Suggested prompts</span>
          {notedCount > 0 ? <span className="noted">{notedCount} noted</span> : <span className="noted quiet">Optional</span>}
        </summary>
        <ul>
          {item.prompts.map((prompt) => {
            const on = noted.includes(prompt.id);
            return (
              <li key={prompt.id}>
                <label className={cx("prompt", on && "on")}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => dispatch({ type: "prompt", criterionId: item.id, promptId: prompt.id })}
                  />
                  <span>{prompt.text}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </details>
    </article>
  );
}

export function RecordsDialog({
  records,
  currentId,
  onOpen,
  onDelete,
  onClose,
}: {
  records: ChecklistRecord[];
  currentId: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const library = records.filter((item) => !isPristine(item));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="records-dialog"
      aria-labelledby="records-title"
      onMouseDown={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <header className="dialog-head">
        <div>
          <p className="kicker">On this browser</p>
          <h2 id="records-title">Saved checklists</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </header>
      {library.length === 0 ? (
        <p className="empty-library">Finished checklists will be listed here, under the name you enter. They stay on this device.</p>
      ) : (
        <ul className="record-list">
          {library.map((item) => {
            const score = scoreRecord(item);
            const progress = coreProgress(item);
            const name = item.identity.name.trim() || "Untitled";
            return (
              <li key={item.id} className={cx("record-row", item.id === currentId && "current")}>
                <button type="button" className="record-open" onClick={() => onOpen(item.id)}>
                  <span className="record-name">{name}</span>
                  <span className="record-meta">
                    {formatWhen(item.updatedAt)} · {shortStatus(score)} · {progress.rated}/10 core ratings
                    {item.id === currentId ? " · Current" : ""}
                  </span>
                </button>
                <button type="button" className="text-btn danger" onClick={() => onDelete(item.id)} aria-label={`Delete checklist for ${name}`}>
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </dialog>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("field", className)}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

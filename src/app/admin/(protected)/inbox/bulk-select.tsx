"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ConfirmForm } from "@/components/admin/confirm-form";

import { deleteInboxMessagesForm, setInboxStatusesForm } from "./actions";

interface Selection {
  ids: string[];
  selected: Set<string>;
  toggle: (id: string) => void;
  setAll: (on: boolean) => void;
}

const SelectionContext = createContext<Selection | null>(null);

function useSelection() {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error("Inside <BulkSelect> only.");
  return selection;
}

/**
 * Lets the admin tick several messages in the (server-rendered) list and
 * act on them together. Renders no element of its own.
 */
export function BulkSelect({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // Messages that have left the list (deleted, moved) can't stay selected.
  const visible = new Set(ids);
  const current = new Set([...selected].filter((id) => visible.has(id)));
  const value: Selection = {
    ids,
    selected: current,
    toggle: (id) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (on) => setSelected(on ? new Set(ids) : new Set()),
  };
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

const boxClass =
  "accent-text h-4 w-4 shrink-0 cursor-pointer rounded border-border align-middle";

/** One message's checkbox, beside (not inside) its link. */
export function SelectBox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useSelection();
  return (
    <label className="flex shrink-0 cursor-pointer items-center self-stretch py-4 pr-1 pl-4 sm:pl-5">
      <input
        type="checkbox"
        checked={selected.has(id)}
        onChange={() => toggle(id)}
        aria-label={`Select message from ${label}`}
        className={boxClass}
      />
    </label>
  );
}

const toolButton =
  "rounded-card border-border text-text hover:border-text/40 border px-3 py-1.5 font-sans text-xs whitespace-nowrap transition-colors disabled:opacity-50";

/** Select all, a count, and actions (read, unread, delete) for what's ticked. */
export function BulkToolbar({ view }: { view: string }) {
  const { ids, selected, setAll } = useSelection();
  const [state, action] = useActionState(deleteInboxMessagesForm, { error: "" });
  const [statusState, statusAction, statusPending] = useActionState(
    setInboxStatusesForm,
    { error: "", doneAt: null },
  );
  // A finished read/unread change clears the selection.
  useEffect(() => {
    if (statusState.doneAt) setAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusState.doneAt]);
  const error = state.error || statusState.error;
  const hidden = [...selected].map((id) => (
    <input key={id} type="hidden" name="ids" value={id} />
  ));
  const all = useRef<HTMLInputElement>(null);
  const count = selected.size;
  const every = count > 0 && count === ids.length;

  useEffect(() => {
    if (all.current) all.current.indeterminate = count > 0 && !every;
  }, [count, every]);

  if (ids.length === 0) return null;
  return (
    <li className="bg-surface border-border sticky top-0 z-10 border-b">
      <div className="flex min-h-12 items-center gap-3 py-2 pr-3 pl-4 sm:pl-5">
        <label className="text-text-muted flex cursor-pointer items-center gap-3 font-sans text-xs">
          <input
            ref={all}
            type="checkbox"
            checked={every}
            onChange={() => setAll(!every)}
            aria-label={every ? "Deselect all messages" : "Select all messages"}
            className={boxClass}
          />
          <span aria-live="polite">{count > 0 ? `${count} selected` : "Select all"}</span>
        </label>
        {count > 0 ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAll(false)}
              className="text-text-muted hover:text-text px-2 py-1.5 font-sans text-xs transition-colors"
            >
              Clear
            </button>
            <form action={statusAction} className="contents">
              {hidden}
              <button
                type="submit"
                name="status"
                value="READ"
                disabled={statusPending}
                className={toolButton}
              >
                Mark read
              </button>
              <button
                type="submit"
                name="status"
                value="NEW"
                disabled={statusPending}
                className={toolButton}
              >
                Mark unread
              </button>
            </form>
            <ConfirmForm
              action={action}
              title={count === 1 ? "Delete 1 message?" : `Delete ${count} messages?`}
              description={`Permanently delete ${
                count === 1 ? "this message" : `these ${count} messages`
              }? This cannot be undone.`}
              label="Delete"
              confirmLabel={count === 1 ? "Delete message" : `Delete ${count} messages`}
              buttonClassName={toolButton}
            >
              {hidden}
              <input type="hidden" name="view" value={view} />
              <input type="hidden" name="confirmDelete" value="delete" />
            </ConfirmForm>
          </div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-text-muted px-4 pb-2 font-sans text-xs sm:px-5">
          {error}
        </p>
      ) : null}
    </li>
  );
}

import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when value is "" (also the label of the "any" entry). */
  placeholder: string;
  ariaLabel?: string;
}

/** Themed dropdown (the native <select> popup can't be styled). Keyboard accessible. */
export function Select({ value, onChange, options, placeholder, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const items: SelectOption[] = [{ value: "", label: placeholder }, ...options];
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openMenu() {
    setActive(Math.max(0, items.findIndex((i) => i.value === value)));
    setOpen(true);
  }

  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openMenu();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      choose(items[active].value);
    }
  }

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-label={ariaLabel ?? placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white/5 px-3 py-3 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
          open ? "border-indigo-400" : "border-white/10 hover:border-white/25"
        } ${selected ? "text-slate-100" : "text-slate-400"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} fill="currentColor" aria-hidden="true">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-[#14152b] p-1 shadow-xl shadow-black/40"
        >
          {items.map((it, i) => {
            const isSel = it.value === value;
            return (
              <li
                key={it.value || "__any"}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(it.value)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  i === active ? "bg-indigo-500/20 text-white" : "text-slate-300"
                } ${it.value === "" ? "text-slate-400" : ""}`}
              >
                <span className="truncate">{it.value === "" ? `All · ${placeholder}` : it.label}</span>
                {isSel && <span className="text-indigo-300">✓</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Debounced name-search input with a keyboard-navigable suggestions
 * dropdown. `fetchResults(query)` must return a Promise<Array<{id,name,skill}>>.
 */
export default function SearchBox({ placeholder, fetchResults, onSelect, autoFocus = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (activeIndex >= 0) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => {
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function handleChange(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (!trimmed) {
      setOpen(false);
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const r = await fetchResults(trimmed);
      setResults(r);
      setActiveIndex(-1);
      setOpen(true);
    }, 150);
  }

  function select(emp) {
    setOpen(false);
    setResults([]);
    setQuery("");
    onSelect(emp.id);
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) select(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex items-center gap-3 border-b-2 border-[var(--hairline)] bg-white px-4 transition-colors duration-150 focus-within:border-primary">
        <svg
          className="h-[18px] w-[18px] shrink-0 text-neutral-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <Input
          type="text"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          autoFocus={autoFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="h-auto flex-1 border-0 bg-transparent px-0 py-4 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:border-0 focus-visible:ring-0"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-10 max-h-[320px] overflow-y-auto overscroll-contain border border-neutral-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="p-4 text-center text-[13px] text-neutral-500">No one matches that name yet</div>
          ) : (
            results.map((emp, i) => (
              <div
                key={emp.id}
                ref={(el) => (itemRefs.current[i] = el)}
                className={cn(
                  "flex cursor-pointer items-center justify-between border-b border-neutral-200 px-4 py-3 text-sm last:border-b-0",
                  i === activeIndex ? "bg-neutral-100" : "hover:bg-neutral-100"
                )}
                onMouseDown={(e) => {
                  // mousedown (not click) so selecting a result can never be
                  // pre-empted by the outside-click handler closing the menu first.
                  e.preventDefault();
                  select(emp);
                }}
              >
                <span className="text-neutral-900">{emp.name}</span>
                <span className="text-[11px] uppercase tracking-[0.05em] text-neutral-500">{emp.skill || ""}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Final" },
  { to: "/draft", label: "Draft" },
  { to: "/swap", label: "Swap" },
  { to: "/profile", label: "Profile" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);

  // Always close the mobile menu on route change — a stuck-open menu after
  // navigating is the classic "burger menu is broken" symptom.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close on outside click. Uses mousedown (fires before click) so it can
  // never race with — or swallow — a tap on a link inside the menu.
  useEffect(() => {
    function onPointerDown(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <header
      className="relative z-50 border-b-2 border-b-primary py-0"
      style={{ background: "var(--topbar)" }}
    >
      <div className="wrap-wide flex h-16 items-center justify-between" ref={navRef}>
        <NavLink to="/" className="inline-flex items-center gap-2 no-underline">
          <span
            className="inline-flex h-8 items-center bg-[var(--topbar-text)] px-2 font-display text-base font-bold uppercase tracking-[0.1em] text-[var(--topbar)]"
          >
            Time
          </span>
          <span className="font-display text-base font-bold uppercase tracking-[0.14em]" style={{ color: "var(--topbar-text)" }}>
            Trackr
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[13px] uppercase tracking-[0.08em] no-underline transition-all duration-150 hover:-translate-y-[1px] hover:bg-[var(--topbar-hover,rgba(255,255,255,0.06))]",
                  isActive ? "text-primary" : "hover:text-[var(--topbar-text)]"
                )
              }
              style={({ isActive }) => ({ color: isActive ? undefined : "var(--topbar-text-dim)" })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "inline-block h-[7px] w-[7px] transition-transform duration-150 group-hover:scale-125",
                      isActive ? "bg-primary" : "bg-transparent"
                    )}
                  />
                  {l.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile burger */}
        <button
          type="button"
          className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] border-0 bg-transparent p-0 sm:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={cn(
              "block h-0.5 w-6 transition-transform duration-200",
              open && "translate-y-[6.5px] rotate-45"
            )}
            style={{ background: "var(--topbar-text)" }}
          />
          <span
            className={cn("block h-0.5 w-6 transition-opacity duration-200", open && "opacity-0")}
            style={{ background: "var(--topbar-text)" }}
          />
          <span
            className={cn(
              "block h-0.5 w-6 transition-transform duration-200",
              open && "-translate-y-[6.5px] -rotate-45"
            )}
            style={{ background: "var(--topbar-text)" }}
          />
        </button>
      </div>

      {/* Mobile dropdown */}
      <nav
        className={cn(
          "flex flex-col overflow-hidden border-t sm:hidden",
          open ? "max-h-[360px]" : "max-h-0 border-t-0"
        )}
        style={{ background: "var(--topbar)", borderColor: "var(--topbar-hairline)", transition: "max-height 0.25s ease" }}
      >
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "wrap-wide flex items-center gap-2 border-b py-6 font-mono text-lg uppercase tracking-[0.08em] no-underline transition-all duration-150 active:pl-1.5 hover:pl-1.5 hover:bg-[var(--topbar-hover,rgba(255,255,255,0.06))]",
                isActive ? "text-primary" : ""
              )
            }
            style={({ isActive }) => ({
              borderColor: "var(--topbar-hairline)",
              color: isActive ? undefined : "var(--topbar-text-dim)",
            })}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

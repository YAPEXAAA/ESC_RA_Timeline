import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import BoardRows from "@/components/BoardRows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, timeAgo, localDateKey } from "@/lib/date";
import { fetchJson } from "@/lib/api";

function useClock() {
  const [text, setText] = useState("");
  useEffect(() => {
    function tick() {
      setText(
        new Date().toLocaleString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return text;
}

async function fetchSearch(q) {
  try {
    return await fetchJson(`/api/search?q=${encodeURIComponent(q)}`);
  } catch {
    return [];
  }
}

export default function Home() {
  const clock = useClock();
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState(null); // { employee, days } | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchJson("/api/stats");
        if (!s || !s.employeeCount) return;
        setStats(s);
      } catch {
        /* stats are a nice-to-have, fail quietly */
      }
    })();
  }, []);

  // The URL (?employee=id) is the single source of truth for which board is
  // shown, so a select only ever needs to update the URL — this effect does
  // the actual fetching, once, whenever that id changes.
  useEffect(() => {
    const id = searchParams.get("employee");
    if (!id) {
      setBoard(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchJson(`/api/employee?id=${encodeURIComponent(id)}`);
        if (cancelled) return;
        setBoard(data);
      } catch (err) {
        if (cancelled) return;
        setBoard(null);
        setError(err.message || "Something went wrong loading that schedule.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Days are listed oldest-first, so jump straight to today's row once the
  // board renders instead of leaving the reader to scroll past history —
  // falling back to the top of the board if today isn't in range.
  useEffect(() => {
    if (!board) return;
    const behavior = "instant" in window ? "instant" : "auto";
    const todayEl = document.getElementById(`day-${localDateKey(new Date())}`);
    if (todayEl) {
      todayEl.scrollIntoView({ behavior, block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, [board]);

  function selectEmployee(id) {
    setSearchParams({ employee: id });
  }

  function backToSearch() {
    setSearchParams({});
    navigate("/");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  if (loading) {
    return (
      <section className="screen flex flex-col items-center py-16 text-center" id="screen-loading">
        <p className="font-mono text-sm text-muted-foreground">Loading schedule…</p>
      </section>
    );
  }

  if (board) {
    return (
      <section className="screen" id="screen-board">
        <Button variant="link" className="mb-6 font-mono text-[13px] text-[var(--text-faint)] hover:text-muted-foreground" onClick={backToSearch}>
          ← Back to search
        </Button>

        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 font-display text-[30px] font-black uppercase tracking-tight text-foreground">{board.employee.name}</h2>
          <Badge variant="outline">{board.employee.skill || ""}</Badge>
        </div>

        {board.days.length === 0 ? (
          <p className="py-6 text-sm text-[var(--text-faint)]">No schedule on file for this person yet.</p>
        ) : (
          <BoardRows days={board.days} />
        )}
      </section>
    );
  }

  return (
    <section className="screen flex min-h-[60vh] flex-col justify-center" id="screen-home">
      <h1 className="m-0 mb-2.5 font-display text-[44px] max-[480px]:text-[34px] font-black uppercase leading-[1.02] tracking-tight text-foreground">
        Find your shifts.
      </h1>
      <span className="text-xs tracking-[0.05em] text-[var(--text-faint)]">{clock}</span>
      <p className="mt-2.5 mb-8 font-mono text-sm text-muted-foreground">Type your name to see when you&rsquo;re on.</p>

      <div className="w-full">
        <SearchBox placeholder="Start typing a name…" fetchResults={fetchSearch} onSelect={selectEmployee} />
      </div>

      {error && <p className="mt-3 text-xs text-[var(--destructive-fg)]">{error}</p>}
      <p className="mt-2.5 text-xs text-[var(--text-faint)]">Schedules update whenever a new file is uploaded.</p>

      {stats && (
        <div className="mt-10 flex flex-wrap items-baseline gap-3 text-[13px]">
          <div className="inline-flex items-baseline gap-1.5">
            <span className="font-medium text-primary">{stats.employeeCount}</span>
            <span className="text-[var(--text-faint)]">people tracked</span>
          </div>
          <div className="text-[var(--text-faint)]">·</div>
          <div className="inline-flex items-baseline gap-1.5">
            <span className="font-medium text-primary">
              {stats.firstDate ? `${formatDate(stats.firstDate)} – ${formatDate(stats.lastDate)}` : "—"}
            </span>
            <span className="text-[var(--text-faint)]">covered</span>
          </div>
          <div className="text-[var(--text-faint)]">·</div>
          <div className="inline-flex items-baseline gap-1.5">
            <span className="font-medium text-primary">{timeAgo(stats.lastUpload)}</span>
            <span className="text-[var(--text-faint)]">last update</span>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-[9px] w-[9px] bg-primary" />
          Working shift
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-[9px] w-[9px] bg-[var(--slate)]" />
          Day off (R)
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-[9px] w-[9px] bg-[var(--leave)]" />
          Paid leave (CP)
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-[9px] w-[9px] bg-[var(--today)]" />
          Today
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="inline-block h-[9px] w-[9px] bg-[var(--tomorrow)]" />
          Tomorrow
        </span>
      </div>
    </section>
  );
}

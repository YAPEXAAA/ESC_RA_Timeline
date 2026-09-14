import { useState } from "react";
import SearchBox from "@/components/SearchBox";
import BoardRows from "@/components/BoardRows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/api";

async function fetchSearch(q) {
  try {
    return await fetchJson(`/api/draft-search?q=${encodeURIComponent(q)}`);
  } catch {
    return [];
  }
}

export default function Draft() {
  const [board, setBoard] = useState(null); // { employee, days } | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function selectEmployee(id) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`/api/draft-employee?id=${encodeURIComponent(id)}`);
      setBoard(data);
    } catch (err) {
      setBoard(null);
      setError(err.message || "No draft schedule found for this person yet.");
    } finally {
      setLoading(false);
    }
  }

  function backToSearch() {
    setBoard(null);
    setError(null);
  }

  if (loading) {
    return (
      <section className="screen flex flex-col items-center py-16 text-center" id="screen-loading">
        <p className="font-mono text-sm text-muted-foreground">Loading draft…</p>
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
          <p className="py-6 text-sm text-[var(--text-faint)]">No draft schedule on file for this person yet.</p>
        ) : (
          <BoardRows days={board.days} staggerMs={30} />
        )}
      </section>
    );
  }

  return (
    <section className="screen flex min-h-[60vh] flex-col justify-center" id="screen-home">
      <h1 className="m-0 mb-2.5 font-display text-[44px] max-[480px]:text-[34px] font-black uppercase leading-[1.02] tracking-tight text-foreground">
        Find the draft.
      </h1>
      <p className="mt-2.5 mb-8 font-mono text-sm text-muted-foreground">
        The draft holds next week&rsquo;s schedule before it&rsquo;s finalized — type your name to preview it.
      </p>

      <div className="w-full">
        <SearchBox placeholder="Start typing a name…" fetchResults={fetchSearch} onSelect={selectEmployee} />
      </div>

      {error && <p className="mt-3 text-xs text-[var(--destructive-fg)]">{error}</p>}
    </section>
  );
}

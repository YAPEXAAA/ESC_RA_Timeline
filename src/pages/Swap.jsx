import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import BoardRows from "@/components/BoardRows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { fetchJson } from "@/lib/api";

const STORAGE_KEY = "esc_ra_employee_id";

export default function Swap() {
  const [status, setStatus] = useState("loading"); // loading | empty | pick | partners | compare
  const [errorMsg, setErrorMsg] = useState("");
  const [data, setData] = useState({ draftDates: [], employees: [], pairs: [] });
  const [agentId, setAgentId] = useState(null);
  const [compareIds, setCompareIds] = useState(null); // [idA, idB]

  const byId = useMemo(() => {
    const map = {};
    for (const e of data.employees) map[e.id] = e;
    return map;
  }, [data.employees]);

  const partnersOf = useMemo(() => {
    const map = {};
    for (const [a, b] of data.pairs) {
      (map[a] ||= new Set()).add(b);
      (map[b] ||= new Set()).add(a);
    }
    return map;
  }, [data.pairs]);

  useEffect(() => {
    (async () => {
      const currentEmpId = localStorage.getItem(STORAGE_KEY);
      if (!currentEmpId) {
        setStatus("empty");
        return;
      }
      try {
        const d = await fetchJson(`/api/swap-candidates?empId=${encodeURIComponent(currentEmpId)}`);
        setData(d);
        if (!d.draftDates || d.draftDates.length === 0) {
          setStatus("empty");
          return;
        }
        setStatus("pick");
        if (d.employees.some((e) => e.id === currentEmpId)) {
          setAgentId(currentEmpId);
          setStatus("partners");
        }
      } catch (e) {
        setErrorMsg(e.message);
        setStatus("error");
      }
    })();
  }, []);

  function selectAgent(id) {
    setAgentId(id);
    setStatus("partners");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function selectCompare(idA, idB) {
    setCompareIds([idA, idB]);
    setStatus("compare");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  async function fetchAgentResults(q) {
    const query = q.toLowerCase();
    return data.employees
      .filter((e) => e.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);
  }

  if (status === "loading") {
    return (
      <section className="screen flex flex-col items-center py-16 text-center" id="screen-loading">
        <p className="font-mono text-sm text-muted-foreground">Loading swap options…</p>
      </section>
    );
  }

  if (status === "empty" && !localStorage.getItem(STORAGE_KEY)) {
    return (
      <section className="screen flex min-h-[60vh] flex-col justify-center" id="screen-empty">
        <h1 className="m-0 mb-2.5 font-display text-[44px] max-[480px]:text-[34px] font-black uppercase leading-[1.02] tracking-tight text-foreground">
          Not logged in.
        </h1>
        <p className="mb-8 font-mono text-sm text-muted-foreground">
          Please go to <Link to="/profile" className="text-primary">Profile</Link> and select your name first.
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="screen flex min-h-[60vh] flex-col justify-center" id="screen-empty">
        <h1 className="m-0 mb-2.5 font-display text-[44px] max-[480px]:text-[34px] font-black uppercase leading-[1.02] tracking-tight text-foreground">
          Error loading swap data.
        </h1>
        <p className="mb-8 font-mono text-sm text-muted-foreground">{errorMsg}</p>
      </section>
    );
  }

  if (status === "empty") {
    return (
      <section className="screen flex min-h-[60vh] flex-col justify-center" id="screen-empty">
        <h1 className="m-0 mb-2.5 font-display text-[44px] max-[480px]:text-[34px] font-black uppercase leading-[1.02] tracking-tight text-foreground">
          No draft on file.
        </h1>
        <p className="mb-8 font-mono text-sm text-muted-foreground">Upload a draft week first — swaps are computed against it.</p>
      </section>
    );
  }

  if (status === "compare" && compareIds) {
    const a = byId[compareIds[0]];
    const b = byId[compareIds[1]];
    return (
      <section className="screen" id="screen-compare">
        <Button variant="link" className="mb-6 font-mono text-[13px] text-[var(--text-faint)] hover:text-muted-foreground" onClick={() => setStatus("partners")}>
          ← Back to partner list
        </Button>

        <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 font-display text-xl font-semibold text-foreground">{a.name}</h3>
            <Badge variant="outline" className="mb-3.5 inline-block">{a.skill || ""}</Badge>
            <BoardRows days={a.week} highlightTodayTomorrow={false} staggerMs={30} />
          </div>
          <div>
            <h3 className="mb-1 font-display text-xl font-semibold text-foreground">{b.name}</h3>
            <Badge variant="outline" className="mb-3.5 inline-block">{b.skill || ""}</Badge>
            <BoardRows days={b.week} highlightTodayTomorrow={false} staggerMs={30} />
          </div>
        </div>

        <p className="mt-7 rounded-[var(--radius)] border border-border bg-[var(--success-bg)] px-4 py-3.5 text-[13px] text-[var(--green)]">
          ✓ This swap keeps both agents under 7 consecutive working days and 12h+ rest between shifts.
        </p>
      </section>
    );
  }

  if (status === "partners" && agentId) {
    const emp = byId[agentId];
    if (!emp) return null;
    const partnerIds = emp.excluded
      ? []
      : [...(partnersOf[agentId] || [])].sort((x, y) => byId[x].name.localeCompare(byId[y].name));

    return (
      <section className="screen" id="screen-partners">
        <Button variant="link" className="mb-6 font-mono text-[13px] text-[var(--text-faint)] hover:text-muted-foreground" onClick={() => setStatus("pick")}>
          ← Choose a different agent
        </Button>

        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          {/* Left: the agent's own week */}
          <div className="md:w-[340px] md:shrink-0">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="m-0 font-display text-[30px] font-black uppercase tracking-tight text-foreground">{emp.name}</h2>
              <Badge variant="outline">{emp.skill || ""}</Badge>
            </div>

            {emp.excluded && (
              <p className="mb-6 text-xs text-[var(--text-faint)]">
                <span className="text-muted-foreground">{emp.excludeReason}</span> — this agent can&rsquo;t swap or be swapped.
              </p>
            )}

            <BoardRows days={emp.week} highlightTodayTomorrow={false} staggerMs={30} />
          </div>

          {/* Right: who they can swap with */}
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 font-display text-lg font-semibold text-foreground md:mt-[3px]">Can legally swap weeks with</h3>
            {emp.excluded ? (
              <p className="py-4 text-[13px] text-[var(--text-faint)]">Not eligible for swaps this week.</p>
            ) : partnerIds.length === 0 ? (
              <p className="py-4 text-[13px] text-[var(--text-faint)]">
                No one else&rsquo;s draft week can be swapped with this agent&rsquo;s without breaking the 7-day or 12h-rest rules.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {partnerIds.map((pid) => {
                  const p = byId[pid];
                  return (
                    <div
                      key={pid}
                      className="flex cursor-pointer items-center justify-between rounded-[var(--radius)] border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-[var(--accent-dim)] hover:bg-[var(--panel-hover)]"
                      onClick={() => selectCompare(agentId, pid)}
                    >
                      <span className="text-foreground">{p.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-faint)]">{p.skill || ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // status === 'pick'
  const first = data.draftDates[0];
  const last = data.draftDates[data.draftDates.length - 1];

  return (
    <section className="screen" id="screen-pick">
      <h1 className="m-0 mb-2.5 font-display text-[44px] max-[480px]:text-[34px] font-black uppercase leading-[1.02] tracking-tight text-foreground">Find a swap.</h1>
      <p className="mb-2 font-mono text-sm text-muted-foreground">Pick an agent to see who they can trade their whole draft week with.</p>
      <p className="mb-8 text-xs text-[var(--text-faint)]">
        Draft week: {formatDate(first)} – {formatDate(last)}
      </p>

      <SearchBox placeholder="Start typing a name…" fetchResults={fetchAgentResults} onSelect={selectAgent} />
    </section>
  );
}

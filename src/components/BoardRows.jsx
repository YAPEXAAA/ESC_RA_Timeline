import { formatDate, localDateKey } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BAR_COLOR = {
  "bar-shift": "bg-primary",
  "bar-off": "bg-[var(--slate)]",
  "bar-leave": "bg-[var(--leave)]",
  "bar-other": "bg-[var(--violet)]",
};

/**
 * Renders a list of schedule days as a themed row grid.
 * Mirrors the exact data/markup semantics of the pre-migration
 * .board-row structure so the visual result is unchanged in layout.
 */
export default function BoardRows({ days, highlightTodayTomorrow = true, staggerMs = 45 }) {
  if (!days || days.length === 0) return null;

  // Every page passes days oldest-first (that's what the sorting/eligibility
  // logic on the backend needs), but on screen the newest date should always
  // be on top — reverse purely for display, once, here, so every list in the
  // app (Final, Draft, Profile, Swap) shows newest-first consistently.
  const orderedDays = [...days].reverse();

  const todayKey = localDateKey(new Date());
  const tomorrowKey = localDateKey(new Date(Date.now() + 86400000));

  return (
    <div className="flex flex-col gap-2">
      {orderedDays.map((day, i) => {
        let barClass = "bar-other";
        let valueContent;

        if (day.type === "shift") {
          barClass = "bar-shift";
          const overnight = day.out <= day.in;
          valueContent = (
            <>
              <span className="font-medium text-foreground">{day.in}</span>
              <span className="text-[var(--text-faint)]">→</span>
              <span className="font-medium text-foreground">{day.out}</span>
              {overnight && <span className="text-[10px] text-[var(--text-faint)]">next day</span>}
            </>
          );
        } else if (day.type === "status") {
          barClass = day.code === "R" ? "bar-off" : day.code === "CP" ? "bar-leave" : "bar-other";
          valueContent = (
            <span className="font-display text-[13px] uppercase tracking-[0.04em] text-muted-foreground">
              {day.label || day.code}
            </span>
          );
        } else {
          valueContent = (
            <span className="font-display text-[13px] uppercase tracking-[0.04em] text-muted-foreground">
              {day.in || ""} {day.out || ""}
            </span>
          );
        }

        let rowStateClasses = "";
        let dateTextClass = "";
        let badge = null;
        if (highlightTodayTomorrow) {
          if (day.date === todayKey) {
            rowStateClasses = "bg-[var(--today-dim)] border-[rgba(78,140,255,0.35)]";
            dateTextClass = "text-[var(--today)]";
            badge = <Badge variant="today" className="ml-1">Today</Badge>;
          } else if (day.date === tomorrowKey) {
            rowStateClasses = "bg-[var(--tomorrow-dim)] border-[rgba(155,107,255,0.35)]";
            dateTextClass = "text-[var(--tomorrow)]";
            badge = <Badge variant="tomorrow" className="ml-1">Tomorrow</Badge>;
          }
        }

        return (
          <div
            key={day.date ?? i}
            id={day.date ? `day-${day.date}` : undefined}
            className={cn(
              "grid grid-cols-[110px_4px_1fr] items-center overflow-hidden rounded-[var(--radius)] border border-border bg-card [animation:flapIn_0.4s_ease_backwards] max-[480px]:grid-cols-[88px_4px_1fr]",
              rowStateClasses
            )}
            style={{ animationDelay: `${i * staggerMs}ms` }}
          >
            <div className={cn("flex flex-col gap-0.5 px-4 py-3.5 text-[13px] text-muted-foreground max-[480px]:px-3", dateTextClass)}>
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-faint)]">{day.dayName}</span>
              <span className={dateTextClass}>{formatDate(day.date)}</span>
            </div>
            <div className={cn("self-stretch", BAR_COLOR[barClass])} />
            <div className="flex flex-wrap items-baseline gap-2.5 px-4.5 py-3.5 text-[15px] max-[480px]:px-3">
              {valueContent}
              {badge}
            </div>
          </div>
        );
      })}
    </div>
  );
}

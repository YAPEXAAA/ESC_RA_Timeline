import { Link } from "react-router-dom";

export default function Footer({ variant = "default" }) {
  if (variant === "upload") {
    return (
      <footer className="relative z-10 border-t border-border py-5">
        <div className="wrap flex flex-wrap justify-between gap-2 text-xs text-[var(--text-faint)]">
          <span>This page isn't linked from search — keep the URL to yourself.</span>
          <Link to="/" className="text-[var(--text-faint)] no-underline border-b border-dotted border-[var(--text-faint)] hover:text-muted-foreground">
            ← Back to search
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative z-10 border-t border-border py-5">
      <div className="wrap flex flex-wrap justify-between gap-2 text-xs text-[var(--text-faint)]">
        <span>Powered by 7355608 Spreadsheets</span>
        <Link to="/upload" className="text-[var(--text-faint)] no-underline border-b border-dotted border-[var(--text-faint)] hover:text-muted-foreground">
          Upload a schedule →
        </Link>
      </div>
    </footer>
  );
}

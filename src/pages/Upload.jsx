import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/date";

const MAX_FILE_BYTES = 3 * 1024 * 1024; // keep in sync with api/upload.js

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default function Upload() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("final");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }
  const [history, setHistory] = useState(null); // array | null
  const [formKey, setFormKey] = useState(0); // bump to reset file input

  async function loadHistory(pw) {
    try {
      const res = await fetch("/api/history", { headers: { "x-upload-password": pw } });
      if (!res.ok) return;
      const items = await res.json();
      if (items.length === 0) return;
      setHistory(items);
    } catch {
      /* quiet */
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (file && file.size > MAX_FILE_BYTES) {
      setMsg({ type: "error", text: `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)}MB).` });
      return;
    }

    setSubmitting(true);
    try {
      const buffer = await file.arrayBuffer();
      const fileBase64 = arrayBufferToBase64(buffer);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-upload-password": password,
        },
        body: JSON.stringify({ filename: file.name, fileBase64, mode }),
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Server error (${res.status}). Check the Vercel function logs for /api/upload.`
        );
      }

      if (!res.ok) throw new Error(data.error || "Upload failed");

      const dates = data.datesAffected.map(formatDate).join(", ");
      setMsg({
        type: "success",
        text: `Published. ${data.employeeCount} people tracked now. Dates updated: ${dates}.`,
      });
      setPassword("");
      setFile(null);
      setMode("final");
      setFormKey((k) => k + 1);
      loadHistory(password);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="relative z-10 border-b-2 border-b-primary py-0" style={{ background: "var(--topbar)" }}>
        <div className="wrap-wide flex h-16 items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 no-underline">
            <span className="inline-flex h-8 items-center bg-[var(--topbar-text)] px-2 font-display text-base font-bold uppercase tracking-[0.1em] text-[var(--topbar)]">
              Time
            </span>
            <span className="font-display text-base font-bold uppercase tracking-[0.14em]" style={{ color: "var(--topbar-text)" }}>
              Trackr
            </span>
          </Link>
          <span className="text-xs uppercase tracking-[0.1em] text-primary">Upload</span>
        </div>
      </header>

      <main className="wrap flex flex-1 min-h-[calc(100vh-65px)] relative z-10 flex-col justify-center py-16">
        <section className="screen w-full">
          <h1 className="m-0 mb-2.5 font-display text-[44px] max-[480px]:text-[34px] font-black uppercase leading-[1.02] tracking-tight text-foreground">
            Upload a schedule.
          </h1>
          <p className="mb-8 font-mono text-sm text-muted-foreground">
            Dates already on file get replaced entirely by whatever&rsquo;s in the new file — no leftover conflicts.
          </p>

          <Card className="mt-8">
            <CardContent>
              <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-4.5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="file">Schedule file (.xlsx)</Label>
                  <Input
                    type="file"
                    id="file"
                    name="file"
                    accept=".xlsx,.xlsm"
                    required
                    onChange={(e) => setFile(e.target.files[0])}
                    className="py-0 pl-0"
                  />
                  <span className="text-xs text-[var(--text-faint)]">Max 3MB.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Upload type</Label>
                  <RadioGroup value={mode} onValueChange={setMode}>
                    <div className="flex items-center gap-2 font-mono text-sm normal-case tracking-normal text-foreground">
                      <RadioGroupItem value="final" id="mode-final" />
                      <Label htmlFor="mode-final" className="normal-case tracking-normal font-mono text-sm text-foreground">
                        Final
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-sm normal-case tracking-normal text-foreground">
                      <RadioGroupItem value="draft" id="mode-draft" />
                      <Label htmlFor="mode-draft" className="normal-case tracking-normal font-mono text-sm text-foreground">
                        Draft
                      </Label>
                    </div>
                  </RadioGroup>
                  <span className="text-xs text-[var(--text-faint)]">
                    Draft is stored separately and only ever keeps the latest week — it doesn&rsquo;t touch the published schedule.
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full font-display text-sm font-semibold uppercase tracking-[0.05em] h-auto py-3.5"
                >
                  {submitting ? "Uploading…" : "Upload & publish"}
                </Button>
              </form>
              {msg && <Alert variant={msg.type}>{msg.text}</Alert>}
            </CardContent>
          </Card>

          {history && history.length > 0 && (
            <div className="mt-7">
              <h3 className="mb-3 font-display text-[13px] uppercase tracking-[0.08em] text-[var(--text-faint)]">Recent uploads</h3>
              <div>
                {history.map((it, i) => (
                  <div key={i} className="border-t border-border py-2.5 text-[12.5px] text-muted-foreground">
                    <span className="text-foreground">{it.filename}</span> — {it.datesAffected.length} dates (
                    {it.datesAffected.map(formatDate).join(", ")}) · {new Date(it.uploadedAt).toLocaleString("en-GB")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-5">
        <div className="wrap flex flex-wrap justify-between gap-2 text-xs text-[var(--text-faint)]">
          <span>This page isn&rsquo;t linked from search — keep the URL to yourself.</span>
          <Link to="/" className="text-[var(--text-faint)] no-underline border-b border-dotted border-[var(--text-faint)] hover:text-muted-foreground">
            ← Back to search
          </Link>
        </div>
      </footer>
    </>
  );
}

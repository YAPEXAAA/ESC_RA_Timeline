import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius)] border border-border bg-background px-3.5 py-2.5",
        "font-mono text-sm text-foreground placeholder:text-[var(--text-faint)]",
        "outline-none transition-colors focus-visible:border-[var(--accent)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:mr-3 file:h-full file:border-0 file:bg-[var(--panel-hover)] file:px-3 file:text-foreground file:font-mono file:text-xs",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };

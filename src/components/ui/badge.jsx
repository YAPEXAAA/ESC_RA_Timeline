import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--radius)] font-display font-semibold uppercase tracking-[0.08em] transition-colors",
  {
    variants: {
      variant: {
        outline: "border border-border bg-transparent text-muted-foreground text-[11px] tracking-[0.08em] px-2.5 py-1",
        today: "bg-[var(--today-dim)] text-[var(--today)] text-[9.5px] px-1.5 py-0.5",
        tomorrow: "bg-[var(--tomorrow-dim)] text-[var(--tomorrow)] text-[9.5px] px-1.5 py-0.5",
        solid: "bg-primary text-primary-foreground text-[11px] px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("mt-4 rounded-[var(--radius)] border px-3.5 py-3 text-sm", {
  variants: {
    variant: {
      success: "bg-[var(--success-bg)] text-[var(--green)] border-[var(--success-border)]",
      error: "bg-[var(--destructive-bg)] text-[var(--destructive-fg)] border-[var(--destructive-border)]",
    },
  },
  defaultVariants: {
    variant: "success",
  },
});

const Alert = React.forwardRef(({ className, variant = "success", ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

export { Alert };

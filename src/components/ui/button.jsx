import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground uppercase font-display font-bold tracking-[0.06em] border-b-4 border-[color-mix(in_srgb,var(--primary)_60%,white_10%)] hover:bg-transparent hover:text-primary hover:border-2 hover:border-primary hover:border-b-2",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-muted-foreground underline-offset-4 hover:underline hover:text-primary p-0 h-auto rounded-none",
        outline:
          "border border-input bg-transparent uppercase tracking-[0.05em] hover:bg-primary hover:text-primary-foreground hover:border-primary",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        icon: "h-8 w-8",
      },
    },
    compoundVariants: [
      // The "link" variant is meant to look and size like plain text, but the
      // default `size` variant's h-10/px-4/py-2 was being applied after it and
      // winning the tailwind-merge conflict, so every "link" button (all the
      // "← Back" links) was silently rendering as a full 40px button box
      // instead of just its text. Re-assert the compact sizing last so it wins
      // no matter what `size` is passed (or defaulted to).
      {
        variant: "link",
        class: "h-auto p-0",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

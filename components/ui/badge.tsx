import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-800",
        secondary: "bg-slate-100 text-slate-700",
        destructive: "bg-red-100 text-red-700",
        success: "bg-emerald-100 text-emerald-700",
        warning: "bg-amber-100 text-amber-700",
        live: "bg-red-500 text-white animate-pulse",
        outline: "border border-current text-current bg-transparent",
        audio: "bg-purple-100 text-purple-700",
        visual: "bg-cyan-100 text-cyan-700",
        tunanetra: "bg-purple-100 text-purple-800",
        tunarungu: "bg-blue-100 text-blue-800",
        both: "bg-red-100 text-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

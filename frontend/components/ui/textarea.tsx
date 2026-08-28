import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-border bg-card/70 px-3.5 py-2.5 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground/60 focus:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

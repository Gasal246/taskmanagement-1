"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const resolvedValue = value ?? 0

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      value={0}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={`h-full w-full flex-1 ${resolvedValue <= 20 ? 'bg-orange-400' : (resolvedValue <= 50 ? 'bg-blue-500' : 'bg-green-400')} transition-all`}
        style={{ transform: `translateX(-${100 - resolvedValue}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

/* Input Component - A component that displays an input - from shadcn/ui (exposes Input) */
import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, readOnly, disabled, ...props }, ref) => {
    const isInteractive = !readOnly && !disabled
    return (
      <input
        type={type}
        readOnly={readOnly}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          isInteractive &&
            'bg-orange-500/10 hover:bg-orange-500/15 focus:bg-orange-500/[0.18] border-orange-500/60 hover:border-orange-400/90 focus:border-orange-500 focus-visible:border-orange-500 focus-visible:ring-orange-500/40 text-orange-50 placeholder:text-orange-200/50 shadow-[0_0_10px_rgba(249,115,22,0.06)]',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }

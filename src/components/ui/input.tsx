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
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          isInteractive &&
            'border-orange-500/50 hover:border-orange-400/80 focus:border-orange-500 focus-visible:border-orange-500 focus-visible:ring-orange-500/30 text-orange-50',
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

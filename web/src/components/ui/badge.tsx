import * as React from 'react'

export const Badge = React.forwardRef<
  React.HTMLAttributes<HTMLSpanElement>,
  HTMLSpanElement
>((props, ref) => {
  return <span ref={ref} {...props} />
})
Badge.displayName = 'Badge'
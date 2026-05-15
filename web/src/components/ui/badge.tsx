import * as React from 'react'

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>((props, ref) => {
  return <span ref={ref} {...props} />
})
Badge.displayName = 'Badge'

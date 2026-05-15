import * as React from 'react'

export const Switch = React.forwardRef<HTMLInputElement, React.HTMLAttributes<HTMLInputElement>>((props, ref) => {
  return <input ref={ref} type="checkbox" {...props} />
})
Switch.displayName = 'Switch'
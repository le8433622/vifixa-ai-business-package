import * as React from 'react'

export const Switch = React.forwardRef<
  React.HTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>((props, ref) => {
  return <input ref={ref} type="checkbox" {...props} />
})
Switch.displayName = 'Switch'
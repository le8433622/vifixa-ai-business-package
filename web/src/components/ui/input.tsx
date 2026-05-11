import * as React from 'react'

export const Input = React.forwardRef<
  React.HTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>((props, ref) => {
  return <input ref={ref} {...props} />
})
Input.displayName = 'Input'
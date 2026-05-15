import * as React from 'react'

export const Input = React.forwardRef<HTMLInputElement, React.HTMLAttributes<HTMLInputElement>>((props, ref) => {
  return <input ref={ref} {...props} />
})
Input.displayName = 'Input'
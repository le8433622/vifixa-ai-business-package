import * as React from 'react'

export const Button = React.forwardRef<
  React.HTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>((props, ref) => {
  return <button ref={ref} {...props} />
})
Button.displayName = 'Button'
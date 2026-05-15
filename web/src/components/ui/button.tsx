import * as React from 'react'

export const Button = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>((props, ref) => {
  return <button ref={ref} {...props} />
})
Button.displayName = 'Button'

import * as React from 'react'

export const Label = React.forwardRef<
  React.HTMLAttributes<HTMLLabelElement>,
  HTMLLabelElement
>((props, ref) => {
  return <label ref={ref} {...props} />
})
Label.displayName = 'Label'
import * as React from 'react'

export const Label = React.forwardRef<HTMLLabelElement, React.HTMLAttributes<HTMLLabelElement>>((props, ref) => {
  return <label ref={ref} {...props} />
})
Label.displayName = 'Label'
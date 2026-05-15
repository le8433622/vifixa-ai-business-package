import * as React from 'react'

export const Select = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
Select.displayName = 'Select'

export const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
SelectContent.displayName = 'SelectContent'

export const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
SelectItem.displayName = 'SelectItem'

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>((props, ref) => {
  return <button ref={ref} {...props} />
})
SelectTrigger.displayName = 'SelectTrigger'

export const SelectValue = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>((props, ref) => {
  return <span ref={ref} {...props} />
})
SelectValue.displayName = 'SelectValue'
import * as React from 'react'

export const Dialog = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
Dialog.displayName = 'Dialog'

export const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
DialogContent.displayName = 'DialogContent'

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>((props, ref) => {
  return <p ref={ref} {...props} />
})
DialogDescription.displayName = 'DialogDescription'

export const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
DialogFooter.displayName = 'DialogFooter'

export const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
DialogHeader.displayName = 'DialogHeader'

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>((props, ref) => {
  return <h2 ref={ref} {...props} />
})
DialogTitle.displayName = 'DialogTitle'

export const DialogTrigger = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>((props, ref) => {
  return <button ref={ref} {...props} />
})
DialogTrigger.displayName = 'DialogTrigger'
import * as React from 'react'

export const Card = React.forwardRef<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>((props, ref) => {
  return <div ref={ref} {...props} />
})
Card.displayName = 'Card'

export const CardHeader = React.forwardRef<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>((props, ref) => {
  return <div ref={ref} {...props} />
})
CardHeader.displayName = 'CardHeader'

export const CardContent = React.forwardRef<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>((props, ref) => {
  return <div ref={ref} {...props} />
})
CardContent.displayName = 'CardContent'

export const CardDescription = React.forwardRef<
  React.HTMLAttributes<HTMLParagraphElement>,
  HTMLParagraphElement
>((props, ref) => {
  return <p ref={ref} {...props} />
})
CardDescription.displayName = 'CardDescription'

export const CardTitle = React.forwardRef<
  React.HTMLAttributes<HTMLHeadingElement>,
  HTMLHeadingElement
>((props, ref) => {
  return <h2 ref={ref} {...props} />
})
CardTitle.displayName = 'CardTitle'
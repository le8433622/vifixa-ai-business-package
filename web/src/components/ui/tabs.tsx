import * as React from 'react'

export const Tabs = React.forwardRef<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>((props, ref) => {
  return <div ref={ref} {...props} />
})
Tabs.displayName = 'Tabs'

export const TabsList = React.forwardRef<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>((props, ref) => {
  return <div ref={ref} {...props} />
})
TabsList.displayName = 'TabsList'

export const TabsContent = React.forwardRef<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>((props, ref) => {
  return <div ref={ref} {...props} />
})
TabsContent.displayName = 'TabsContent'

export const TabsTrigger = React.forwardRef<
  React.HTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
>((props, ref) => {
  return <button ref={ref} {...props} />
})
TabsTrigger.displayName = 'TabsTrigger'
import * as React from 'react'

export const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
Tabs.displayName = 'Tabs'

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
TabsList.displayName = 'TabsList'

export const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return <div ref={ref} {...props} />
})
TabsContent.displayName = 'TabsContent'

export const TabsTrigger = React.forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>((props, ref) => {
  return <button ref={ref} {...props} />
})
TabsTrigger.displayName = 'TabsTrigger'
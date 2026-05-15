import * as React from 'react'

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>((props, ref) => {
  return <table ref={ref} {...props} />
})
Table.displayName = 'Table'

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => {
  return <thead ref={ref} {...props} />
})
TableHeader.displayName = 'TableHeader'

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => {
  return <tbody ref={ref} {...props} />
})
TableBody.displayName = 'TableBody'

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>((props, ref) => {
  return <tr ref={ref} {...props} />
})
TableRow.displayName = 'TableRow'

export const TableCell = React.forwardRef<HTMLTableCellElement, React.HTMLAttributes<HTMLTableCellElement>>((props, ref) => {
  return <td ref={ref} {...props} />
})
TableCell.displayName = 'TableCell'

export const TableHead = React.forwardRef<HTMLTableCellElement, React.HTMLAttributes<HTMLTableCellElement>>((props, ref) => {
  return <th ref={ref} {...props} />
})
TableHead.displayName = 'TableHead'
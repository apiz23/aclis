"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Column,
} from "@tanstack/react-table"
import {
  ArrowDown, ArrowUp, ArrowUpDown,
  ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

// ─── Reusable sortable column header ─────────────────────────────────────────
export function SortableHeader({
  column,
  title,
  className,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: Column<any, unknown>
  title: string
  className?: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      className={`-ml-3 h-8 px-3 text-xs font-medium text-muted-foreground ${className ?? ""}`}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1.5 h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1.5 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-40" />
      )}
    </Button>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  onRowClick?: (row: TData) => void
  getRowClassName?: (row: TData) => string
  pageSize?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  onRowClick,
  getRowClassName,
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting]               = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters]   = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVis]    = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter]     = React.useState("")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVis,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    initialState: { pagination: { pageSize } },
  })

  const pageCount  = table.getPageCount()
  const pageIndex  = table.getState().pagination.pageIndex
  const totalShown = table.getFilteredRowModel().rows.length

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b flex items-center gap-2">
        {searchPlaceholder && (
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-52 h-8 text-sm"
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {totalShown} rekod
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                Lajur <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize text-xs"
                    checked={col.getIsVisible()}
                    onCheckedChange={(val) => col.toggleVisibility(!!val)}
                  >
                    {typeof col.columnDef.header === "string"
                      ? col.columnDef.header
                      : col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={[
                  onRowClick ? "cursor-pointer hover:bg-muted/40" : "",
                  getRowClassName?.(row.original) ?? "",
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                Tiada rekod.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {pageCount > 1 && (
        <div className="px-4 py-2.5 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Halaman {pageIndex + 1} daripada {pageCount}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

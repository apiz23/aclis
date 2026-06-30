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
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react"
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
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination"

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: (number | "ellipsis")[] = [0]
  const lo = Math.max(1, current - 1)
  const hi = Math.min(total - 2, current + 1)
  if (lo > 1) pages.push("ellipsis")
  for (let i = lo; i <= hi; i++) pages.push(i)
  if (hi < total - 2) pages.push("ellipsis")
  pages.push(total - 1)
  return pages
}

// ─── DataTable ────────────────────────────────────────────────────────────────
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  onRowClick?: (row: TData) => void
  getRowClassName?: (row: TData) => string
  pageSize?: number
  showRowNumbers?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  onRowClick,
  getRowClassName,
  pageSize = 10,
  showRowNumbers = true,
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

  const pageCount   = table.getPageCount()
  const { pageIndex, pageSize: currentPageSize } = table.getState().pagination
  const totalShown  = table.getFilteredRowModel().rows.length

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
              {showRowNumbers && (
                <TableHead className="w-10 text-center text-xs">No.</TableHead>
              )}
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
            table.getRowModel().rows.map((row, i) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={[
                  onRowClick ? "cursor-pointer hover:bg-muted/40" : "",
                  getRowClassName?.(row.original) ?? "",
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(row.original)}
              >
                {showRowNumbers && (
                  <TableCell>
                    <div className="text-center tabular-nums text-xs text-muted-foreground">
                      {pageIndex * currentPageSize + i + 1}
                    </div>
                  </TableCell>
                )}
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
                colSpan={columns.length + (showRowNumbers ? 1 : 0)}
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
        <div className="border-t px-4 py-3">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="Sebelum"
                  href="#"
                  onClick={(e) => { e.preventDefault(); table.previousPage() }}
                  aria-disabled={!table.getCanPreviousPage()}
                  className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {getPageNumbers(pageIndex, pageCount).map((page, i) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === pageIndex}
                      onClick={(e) => { e.preventDefault(); table.setPageIndex(page) }}
                    >
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  text="Seterusnya"
                  href="#"
                  onClick={(e) => { e.preventDefault(); table.nextPage() }}
                  aria-disabled={!table.getCanNextPage()}
                  className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { cn } from "../../lib/utils.js";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu.js";
import { Input } from "../ui/input.js";
import { LottieLoader } from "../ui/lottie-loader.js";
import { Skeleton } from "../ui/skeleton.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table.js";

export function DataTable({
  title,
  columns,
  data,
  searchPlaceholder = "Search records",
  emptyTitle = "No records found",
  emptyDescription = "There is nothing to show yet.",
  actions,
  loading = false,
  cardClassName,
  headerClassName,
  contentClassName,
  tableWrapperClassName,
  footerClassName,
  compact = false,
  mobileRow
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString"
  });

  const visibleColumns = useMemo(
    () => table.getAllColumns().filter((column) => column.getCanHide()),
    [table]
  );
  const [expandedMobileRows, setExpandedMobileRows] = useState({});

  function toggleMobileRow(rowId) {
    setExpandedMobileRows((current) => ({
      ...current,
      [rowId]: !current[rowId]
    }));
  }

  return (
    <Card className={cn("motion-card", cardClassName)}>
      <CardHeader className={cn("flex flex-col gap-4 border-b border-border/80 md:flex-row md:items-center md:justify-between", headerClassName)}>
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:min-w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4" />
                Columns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {visibleColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  checked={column.getIsVisible()}
                  key={column.id}
                  onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                >
                  {column.columnDef.meta?.label || column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {actions}
        </div>
      </CardHeader>
      <CardContent className={cn("p-0", contentClassName)}>
        {mobileRow ? (
          <div className="divide-y divide-border md:hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8">
                <LottieLoader className="h-20 w-20" name="dataTable" />
                <p className="text-sm font-medium text-muted-foreground">Loading records...</p>
              </div>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <div className="px-3 py-3" key={row.id}>
                  {mobileRow({
                    row,
                    isExpanded: Boolean(expandedMobileRows[row.id]),
                    toggleExpanded: () => toggleMobileRow(row.id)
                  })}
                </div>
              ))
            ) : (
              <div className="px-4 py-12 text-center">
                <div className="space-y-1">
                  <p className="font-medium">{emptyTitle}</p>
                  <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
        <div className={cn("max-h-[560px] overflow-auto", mobileRow && "hidden md:block", tableWrapperClassName)}>
          <Table className={compact ? "text-[13px]" : ""}>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead className={compact ? "h-10 px-3 text-[10px]" : ""} key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading
                ? (
                    <>
                      <TableRow>
                        <TableCell className="py-8 text-center" colSpan={columns.length}>
                          <div className="flex flex-col items-center justify-center gap-2">
                            <LottieLoader className="h-24 w-24" name="dataTable" />
                            <p className="text-sm font-medium text-muted-foreground">Loading records...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {columns.map((column, columnIndex) => (
                            <TableCell className={compact ? "px-3 py-2 text-[13px]" : ""} key={`${index}-${columnIndex}`}>
                              <Skeleton className="h-4 w-full max-w-40" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </>
                  )
                : table.getRowModel().rows.length > 0
                  ? table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell className={compact ? "px-3 py-2 align-top" : ""} key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (
                    <TableRow>
                      <TableCell className="py-16 text-center" colSpan={columns.length}>
                        <div className="space-y-1">
                          <p className="font-medium">{emptyTitle}</p>
                          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
          </Table>
        </div>
        <div className={cn("flex flex-col gap-3 border-t border-border/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between", footerClassName)}>
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {data.length} record(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * DataTable — componente genérico de tabla con TanStack Table v8.
 * Soporta: paginación, búsqueda global, ordenamiento por columna, click en fila.
 */

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Re-exportar para módulos
export { type ColumnDef };

interface DataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  emptyMessage?: string;
  showSearch?: boolean;
  toolbar?: React.ReactNode;
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  searchPlaceholder = "Buscar...",
  pageSize = 20,
  onRowClick,
  loading = false,
  emptyMessage = "No hay datos para mostrar.",
  showSearch = true,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const filteredTotal = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar */}
      {(showSearch || toolbar) && (
        <div className="flex items-center justify-between gap-3 flex-shrink-0">
          {showSearch && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value);
                  table.setPageIndex(0);
                }}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-auto rounded-md border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "h-9 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap select-none",
                        canSort && "cursor-pointer hover:text-slate-800"
                      )}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="opacity-50">
                              {sorted === "asc"
                                ? <ChevronUp className="w-3 h-3" />
                                : sorted === "desc"
                                  ? <ChevronDown className="w-3 h-3" />
                                  : <ChevronsUpDown className="w-3 h-3" />
                              }
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <span className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-blue-50/60 active:bg-blue-100/60"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500">
            {filteredTotal.toLocaleString("es-CO")} registro{filteredTotal !== 1 ? "s" : ""}
            {" · "}Página {currentPage} de {pageCount}
          </span>
          <div className="flex items-center gap-1">
            {[
              { icon: ChevronsLeft, action: () => table.setPageIndex(0), disabled: !table.getCanPreviousPage() },
              { icon: ChevronLeft, action: () => table.previousPage(), disabled: !table.getCanPreviousPage() },
              { icon: ChevronRight, action: () => table.nextPage(), disabled: !table.getCanNextPage() },
              { icon: ChevronsRight, action: () => table.setPageIndex(pageCount - 1), disabled: !table.getCanNextPage() },
            ].map(({ icon: Icon, action, disabled }, i) => (
              <Button
                key={i}
                variant="outline" size="icon"
                className="h-7 w-7"
                onClick={action}
                disabled={disabled}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  createColumnHelper,
  getPaginationRowModel
} from '@tanstack/react-table';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchTransactions, deleteTransaction } from '@/services/transactionService';
import type { Transaction } from '@/types';
import { format } from 'date-fns';
import { Loader2, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next"; // Add this import
import useWorkspaceStore from '@/store/useWorkspaceStore'; // Import useWorkspaceStore

interface TransactionHistoryProps {
  workspaceId: string;
  type?: 'income' | 'expense';
  refreshTrigger?: number; // To trigger reload from parent
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  workspaceId,
  type,
  refreshTrigger
}) => {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { t } = useTranslation(); // Initialize useTranslation
  const { currentWorkspace } = useWorkspaceStore(); // Get currentWorkspace from the store

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchTransactions(workspaceId, {
        page: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        type: type // Optional filter
      });
      setData(result.results);
      setTotalCount(result.count);
    } catch (error) {
      console.error("Failed to load transactions", error);
      toast.error("Failed to load transactions history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId, type, pagination.pageIndex, pagination.pageSize, refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await deleteTransaction(workspaceId, id);
      toast.success("Transaction deleted");
      loadData();
    } catch (error) {
      toast.error("Failed to delete transaction");
    }
  };

  const columnHelper = createColumnHelper<Transaction>();

  const monthKeys = [
    "months.1", "months.2", "months.3", "months.4",
    "months.5", "months.6", "months.7", "months.8",
    "months.9", "months.10", "months.11", "months.12"
  ];

  const columns = React.useMemo(() => [
    columnHelper.accessor('date', {
      header: 'Date',
      cell: info => {
        const dateVal = info.getValue();
        if (!dateVal) return "-";
        
        const date = new Date(dateVal);
        const displayMode = currentWorkspace?.settings?.display_mode || 'day';
        
        const year = format(date, 'yyyy');
        const monthIndex = date.getMonth(); // 0-11
        const translatedMonth = t(monthKeys[monthIndex]);

        if (displayMode === 'month') {
             return `${translatedMonth} ${year}`;
        }

        const day = format(date, 'dd');
        return `${day}. ${translatedMonth} ${year}`;
      },
    }),
    columnHelper.accessor('original_amount', {
      header: 'Original Amount',
      cell: info => {
          const val = Number(info.getValue());
          return <span className={info.row.original.type === 'income' ? 'text-green-600' : 'text-red-600'}>
              {info.row.original.type === 'income' ? '+' : '-'} {val.toFixed(2)}
          </span>
      }
    }),
    columnHelper.accessor('original_currency', {
        header: 'Currency',
    }),
    columnHelper.accessor('amount_domestic', {
      header: 'Domestic Amount',
      cell: info => {
          const val = Number(info.getValue());
          const currency = currentWorkspace?.settings?.domestic_currency || "EUR";
          return <span className={info.row.original.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {info.row.original.type === 'income' ? '+' : '-'} {val.toFixed(2)} {currency}
          </span>
      }
    }),
    columnHelper.accessor('expense_category', {
      header: 'Category',
      // Backend returns IDs usually, but list serializer might return names? 
      // Check TransactionListSerializer in backend.
      // It has `category_name` field!
      cell: info => {
          const row = info.row.original;
          return row.category_name || row.expense_category || row.income_category || "Uncategorized";
      }
    }),
    columnHelper.accessor('tag_list', {
      header: 'Tags',
      cell: info => (
        <div className="flex gap-1 flex-wrap">
          {(info.getValue() || []).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">{tag}</Badge>
          ))}
        </div>
      )
    }),
    columnHelper.accessor('note_manual', {
      header: 'Note',
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <Button variant="ghost" size="icon" onClick={() => handleDelete(info.row.original.id)}>
          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
        </Button>
      )
    })
  ], [t, currentWorkspace]); // Add t and currentWorkspace to the dependency array of useMemo

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  if (loading && data.length === 0) {
      return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Transaction History</h3>
        {currentWorkspace?.settings?.domestic_currency && (
          <span className="text-sm text-muted-foreground">
            Domestic Currency: {currentWorkspace.settings.domestic_currency}
          </span>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm">
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
           <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

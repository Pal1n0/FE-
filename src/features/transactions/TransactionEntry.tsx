import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionFormSchema } from './schema';
import type { TransactionForm, TransactionRow } from './schema';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Save, Send, Loader2, RotateCcw } from 'lucide-react';
import { CategorySelect } from './components/CategorySelect';
import { TagInput } from './components/TagInput';
import { CurrencySelect } from './components/CurrencySelect';
import { 
  saveDraft, 
  fetchWorkspaceDraft, 
  bulkSyncTransactions, 
  deleteDraft,
} from '@/services/transactionService';
import type { TransactionPayload } from '@/services/transactionService';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import useWorkspaceStore from '@/store/useWorkspaceStore';
import useCategoryStore from '@/store/useCategoryStore';

interface TransactionEntryProps {
  workspaceId: string;
  type: 'income' | 'expense';
  onTransactionSaved?: () => void;
}

export const TransactionEntry: React.FC<TransactionEntryProps> = ({
  workspaceId,
  type,
  onTransactionSaved
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const { currentWorkspace } = useWorkspaceStore();
  const displayMode = currentWorkspace?.settings?.display_mode || 'day';
  
  const { fetchVersions, fetchCategories, activeVersion } = useCategoryStore();

  // Fetch categories when workspaceId or type changes
  useEffect(() => {
    fetchVersions(workspaceId, type);
  }, [workspaceId, type, fetchVersions]);

  useEffect(() => {
    if (activeVersion) {
      fetchCategories(workspaceId, type, activeVersion.id);
    }
  }, [activeVersion, workspaceId, type, fetchCategories]);

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      transactions: []
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "transactions"
  });

  // Load draft on mount or type change
  useEffect(() => {
    const loadDraft = async () => {
      setIsLoading(true);
      try {
        // We only want the draft for the CURRENT type
        const draft = await fetchWorkspaceDraft(workspaceId, type);
        
        // If draft exists AND matches our current type
        if (draft && draft.draft_type === type) {
          setDraftId(draft.id);
          // Map draft data to form
          // Check if transactions_data is valid
          if (Array.isArray(draft.transactions_data)) {
             const mappedData = draft.transactions_data.map((tx: any) => ({
                 id: tx.id || uuidv4(),
                 date: tx.date || "", // Default to empty if missing
                 amount: tx.original_amount ? Number(tx.original_amount) : 0,
                 currency: tx.original_currency || currentWorkspace?.settings?.domestic_currency || "EUR",
                 categoryId: tx.expense_category_id || tx.income_category_id || "",
                 description: tx.note_manual || "",
                 tags: tx.tags || [],
                 type: type // Ensure type matches
             }));
             replace(mappedData);
          }
        } else {
            // No draft or wrong type (e.g. user switched tabs but draft was for other type)
            // If wrong type, we ignore it for this view. 
            // We start fresh or empty.
            setDraftId(null);
            replace([]);
            // Optionally add one empty row to start
            append(createEmptyRow());
        }
      } catch (error) {
        console.error("Failed to load draft", error);
        toast.error("Failed to load draft");
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [workspaceId, type, replace, append]); // Re-run when type changes

  const createEmptyRow = (): TransactionRow => ({
    id: uuidv4(),
    date: "", // Default to empty
    amount: 0,
    currency: currentWorkspace?.settings?.domestic_currency || "EUR",
    categoryId: "",
    description: "",
    tags: [],
    type: type
  });

  const handleAddRow = () => {
    append(createEmptyRow());
  };

  const handleSaveDraft = async () => {
    const values = form.getValues();
    // Validate minimally? Or allow saving incomplete drafts?
    // Drafts usually allow incomplete data. Zod schema might be too strict for draft.
    // But let's try to save what we have.
    
    setIsSaving(true);
    try {
        // Prepare payload
        // We need to map form data to backend Draft structure
        const transactionsData = values.transactions.map(tx => ({
            id: tx.id, // Persist ID
            type: type,
            date: tx.date,
            original_amount: tx.amount,
            original_currency: tx.currency,
            // Map category based on type
            [type === 'expense' ? 'expense_category_id' : 'income_category_id']: tx.categoryId,
            note_manual: tx.description,
            tags: tx.tags
        }));

        const result = await saveDraft(workspaceId, {
            draft_type: type,
            transactions_data: transactionsData
        });
        
        setDraftId(result.id);
        toast.success("Draft saved");
    } catch (error) {
        console.error("Failed to save draft", error);
        toast.error("Failed to save draft");
    } finally {
        setIsSaving(false);
    }
  };

  const handleClear = async () => {
      if (draftId) {
          try {
              await deleteDraft(workspaceId, draftId);
              setDraftId(null);
          } catch (e) {
              console.error("Error deleting draft", e);
          }
      }
      replace([createEmptyRow()]);
      toast.info("Form cleared");
  }

  const onSubmit = async (data: TransactionForm) => {
    setIsSaving(true);
    try {
        // 1. Prepare payload for bulk sync
        const payload: TransactionPayload[] = data.transactions.map(tx => ({
            type: type,
            date: tx.date,
            original_amount: tx.amount,
            original_currency: tx.currency,
            [type === 'expense' ? 'expense_category' : 'income_category']: tx.categoryId,
            note_manual: tx.description,
            tags: tx.tags
        }));

        // 2. Send to backend
        await bulkSyncTransactions(workspaceId, { create: payload });

        // 3. Draft cleanup is handled automatically by the backend now (Atomic)
        setDraftId(null);

        // 4. Reset form
        replace([createEmptyRow()]);
        toast.success("Transactions processed successfully");
        
        if (onTransactionSaved) {
            onTransactionSaved();
        }

    } catch (error: any) {
        console.error("Failed to process transactions", error);
        toast.error("Failed to process transactions");
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
      return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
              New {type === 'income' ? 'Income' : 'Expense'} Entry
          </h2>
          <div className="space-x-2">
               <Button variant="outline" size="sm" onClick={handleClear} disabled={isSaving}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSaveDraft} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
              </Button>
               <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Process All
              </Button>
          </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead className="w-[200px]">Category</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead className="w-[80px]">Curr</TableHead>
              <TableHead className="w-[200px]">Tags</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>
                  <Controller
                    control={form.control}
                    name={`transactions.${index}.date`}
                    render={({ field }) => (
                      <Input 
                        type={displayMode === 'month' ? 'month' : 'date'}
                        {...field}
                        value={displayMode === 'month' && field.value ? field.value.slice(0, 7) : field.value}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (displayMode === 'month' && val) {
                            val = `${val}-01`;
                          }
                          field.onChange(val);
                        }}
                        className={form.formState.errors.transactions?.[index]?.date ? "border-red-500" : ""}
                      />
                    )}
                  />
                  {form.formState.errors.transactions?.[index]?.date && (
                    <span className="text-xs text-red-500">{form.formState.errors.transactions[index]?.date?.message}</span>
                  )}
                </TableCell>
                <TableCell>
                   <Controller
                    control={form.control}
                    name={`transactions.${index}.categoryId`}
                    render={({ field }) => (
                                            <CategorySelect
                                              workspaceId={workspaceId}
                                              type={type}
                                              value={field.value}
                                              onChange={field.onChange}
                                              className={form.formState.errors.transactions?.[index]?.categoryId ? "border-red-500" : ""}
                                            />                    )}
                  />
                  {form.formState.errors.transactions?.[index]?.categoryId && (
                    <span className="text-xs text-red-500">{form.formState.errors.transactions[index]?.categoryId?.message}</span>
                  )}
                </TableCell>
                <TableCell>
                   <Controller
                    control={form.control}
                    name={`transactions.${index}.amount`}
                    render={({ field }) => {
                        // Initialize local state with field.value, formatted as string
                        const [localAmountString, setLocalAmountString] = useState(
                            field.value === 0 && String(field.value) === '0' ? '' : String(field.value) // Handle 0 as empty string initially
                        );

                        // Effect to update localAmountString when field.value changes externally (e.g., form reset)
                        useEffect(() => {
                            const newValue = field.value === 0 && String(field.value) === '0' ? '' : String(field.value);
                            if (newValue !== localAmountString) { // Only update if actual value differs
                                setLocalAmountString(newValue);
                            }
                        }, [field.value]); // Trigger when form's field.value changes

                        const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                            const inputValue = e.target.value;
                            
                            // Start with a clean filtered value
                            let filteredValue = '';
                            let hasDecimal = false;

                            // Filtering logic: Allow digits and a single decimal separator (dot or comma)
                            for (let i = 0; i < inputValue.length; i++) {
                                const char = inputValue[i];
                                if (char >= '0' && char <= '9') {
                                    filteredValue += char;
                                } else if ((char === '.' || char === ',') && !hasDecimal) {
                                    // If it's a decimal separator and no digits yet, prepend '0' if not already '0'
                                    if (filteredValue.length === 0 && char === '.') {
                                        filteredValue = '0.';
                                    } else if (filteredValue.length === 0 && char === ',') {
                                        filteredValue = '0,';
                                    } else {
                                        filteredValue += char;
                                    }
                                    hasDecimal = true;
                                }
                                // Ignore other characters
                            }

                            setLocalAmountString(filteredValue); // Update local state (what user sees)

                            // Now, update react-hook-form's actual numeric value for validation/submission
                            const sanitizedForParse = filteredValue.replace(',', '.');
                            const parsedValue = parseFloat(sanitizedForParse);

                            if (filteredValue === '' || filteredValue === '.' || filteredValue === ',') {
                                // If cleared, or just a separator, form value is 0
                                field.onChange(0); 
                            } else if (!isNaN(parsedValue)) {
                                field.onChange(Math.max(0, parsedValue)); // If valid number, update form value
                            } else {
                                // This case should ideally not be reached with the filtering,
                                // but as a fallback, set to 0.
                                field.onChange(0); 
                            }
                        };

                        return (
                            <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*[.,]?[0-9]*"
                                min="0"
                                {...field}
                                value={localAmountString} // Input shows what's in local state
                                onChange={handleLocalChange}
                                onBlur={(e) => {
                                    // On blur, ensure the form's internal field.value is finalized as a number
                                    // based on the final localAmountString.
                                    const sanitizedForParse = localAmountString.replace(',', '.');
                                    const parsedValue = parseFloat(sanitizedForParse);

                                    if (localAmountString === '' || localAmountString === '.' || localAmountString === ',') {
                                        field.onChange(0);
                                    } else if (!isNaN(parsedValue)) {
                                        field.onChange(Math.max(0, parsedValue));
                                    } else {
                                        field.onChange(0); // Fallback to 0 if somehow an invalid string remains
                                    }
                                    field.onBlur(); // Call react-hook-form's onBlur
                                }}
                                className={form.formState.errors.transactions?.[index]?.amount ? "border-red-500" : ""}
                            />
                        );
                    }}
                  />
                </TableCell>
                 <TableCell>
                   <Controller
                    control={form.control}
                    name={`transactions.${index}.currency`}
                    render={({ field }) => (
                      <CurrencySelect 
                        value={field.value}
                        onChange={field.onChange}
                        className={form.formState.errors.transactions?.[index]?.currency ? "border-red-500" : ""}
                      />
                    )}
                  />
                </TableCell>
                 <TableCell>
                   <Controller
                    control={form.control}
                    name={`transactions.${index}.tags`}
                    render={({ field }) => (
                      <TagInput 
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                   <Controller
                    control={form.control}
                    name={`transactions.${index}.description`}
                    render={({ field }) => (
                      <Input {...field} placeholder="Note..." />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" className="w-full border-dashed" onClick={handleAddRow}>
        <Plus className="w-4 h-4 mr-2" />
        Add Row
      </Button>
    </div>
  );
};

export interface Transaction {
  id: string;
  user: string;
  workspace: string;
  type: 'income' | 'expense';
  expense_category: string | null;
  income_category: string | null;
  original_amount: string;
  original_currency: string;
  amount_domestic: string;
  date: string;
  month: string;
  tag_list: string[];
  note_manual: string;
  note_auto: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionDraft {
  id: string;
  user: string;
  workspace: string;
  draft_type: 'income' | 'expense';
  transactions_data: Partial<Transaction>[];
  transactions_count: number;
  last_modified: string;
  created_at: string;
}

export type HardDeleteConfirmation = {
  standard: boolean;
  workspace_name: string;
  admin?: string;
};

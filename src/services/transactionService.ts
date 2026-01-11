import apiClient from './apiClient';
import type { Transaction, TransactionDraft } from '../types';

// Types for creating/updating transactions
export interface TransactionPayload {
  id?: string; // Optional for updates
  type: 'income' | 'expense';
  expense_category?: string | null;
  income_category?: string | null;
  original_amount: number; // Backend expects number/decimal
  original_currency: string;
  date: string; // YYYY-MM-DD
  tags?: string[]; // List of tag names
  note_manual?: string;
}

export interface TransactionFilterParams {
  page?: number;
  page_size?: number;
  type?: 'income' | 'expense';
  date_from?: string;
  date_to?: string;
  category_id?: string;
  search?: string;
}

export interface BulkSyncPayload {
  create?: TransactionPayload[];
  update?: TransactionPayload[];
  delete?: string[]; // IDs
}

// --- Transactions ---

export const fetchTransactions = async (
  workspaceId: string,
  params: TransactionFilterParams = {}
): Promise<{ results: Transaction[]; count: number }> => {
  const response = await apiClient.get(`/api/workspaces/${workspaceId}/transactions/`, {
    params,
  });
  return response.data;
};

export const createTransaction = async (
  workspaceId: string,
  data: TransactionPayload
): Promise<Transaction> => {
  const response = await apiClient.post(
    `/api/workspaces/${workspaceId}/transactions/`,
    data
  );
  return response.data;
};

export const updateTransaction = async (
  workspaceId: string,
  transactionId: string,
  data: Partial<TransactionPayload>
): Promise<Transaction> => {
  const response = await apiClient.patch(
    `/api/workspaces/${workspaceId}/transactions/${transactionId}/`,
    data
  );
  return response.data;
};

export const deleteTransaction = async (
  workspaceId: string,
  transactionId: string
): Promise<void> => {
  await apiClient.delete(
    `/api/workspaces/${workspaceId}/transactions/${transactionId}/`
  );
};

export const bulkSyncTransactions = async (
    workspaceId: string,
    payload: BulkSyncPayload
): Promise<void> => {
    await apiClient.post(`/api/workspaces/${workspaceId}/transactions/bulk-sync/`, payload);
}

// --- Drafts ---

export const fetchDrafts = async (
  workspaceId: string
): Promise<{ results: TransactionDraft[]; count: number }> => {
  const response = await apiClient.get(
    `/api/workspaces/${workspaceId}/transaction-drafts/`
  );
  return response.data;
};

export const fetchWorkspaceDraft = async (
  workspaceId: string,
  draftType?: 'income' | 'expense'
): Promise<TransactionDraft | null> => {
  try {
    const params = draftType ? { type: draftType } : {};
    const response = await apiClient.get(
      `/api/workspaces/${workspaceId}/transaction-drafts/get-workspace-draft/`,
      { params }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const saveDraft = async (
  workspaceId: string,
  data: {
    draft_type: 'income' | 'expense';
    transactions_data: any[]; // JSON data
  }
): Promise<TransactionDraft> => {
  const response = await apiClient.post(
    `/api/workspaces/${workspaceId}/transaction-drafts/`,
    data
  );
  return response.data;
};

export const updateDraft = async (
    workspaceId: string,
    draftId: string,
    data: {
        draft_type?: 'income' | 'expense';
        transactions_data: any[];
    }
): Promise<TransactionDraft> => {
    const response = await apiClient.patch(
        `/api/workspaces/${workspaceId}/transaction-drafts/${draftId}/`,
        data
    );
    return response.data;
}

export const deleteDraft = async (
  workspaceId: string,
  draftId: string
): Promise<void> => {
  await apiClient.delete(
    `/api/workspaces/${workspaceId}/transaction-drafts/${draftId}/`
  );
};
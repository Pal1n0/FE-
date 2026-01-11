import React from 'react';
import { useParams } from 'react-router-dom';
import { TransactionManager } from '@/features/transactions/TransactionManager';

const TransactionsPage: React.FC = () => {
  const { workspaceId, tab } = useParams<{ workspaceId: string; tab?: string }>();

  if (!workspaceId) {
    return <div>Workspace ID is missing</div>;
  }

  // Map URL params to internal tab names
  const validTab = tab === 'incomes' ? 'income' : 'expense';

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      <TransactionManager workspaceId={workspaceId} defaultTab={validTab} />
    </div>
  );
};

export default TransactionsPage;
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionEntry } from './TransactionEntry';
import { TransactionHistory } from './TransactionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useParams } from 'react-router-dom';

interface TransactionManagerProps {
  workspaceId: string;
  defaultTab?: string;
}

export const TransactionManager: React.FC<TransactionManagerProps> = ({ workspaceId, defaultTab = 'expense' }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const navigate = useNavigate();

  const handleTransactionSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const onTabChange = (value: string) => {
      setActiveTab(value);
      // Optional: Update URL to reflect tab change
      const urlTab = value === 'income' ? 'incomes' : 'expenses';
      navigate(`/${workspaceId}/transactions/${urlTab}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionEntry 
                workspaceId={workspaceId} 
                type="expense" 
                onTransactionSaved={handleTransactionSaved}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense History</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionHistory 
                workspaceId={workspaceId} 
                type="expense" 
                refreshTrigger={refreshTrigger}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
           <Card>
            <CardHeader>
              <CardTitle>Add Income</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionEntry 
                workspaceId={workspaceId} 
                type="income" 
                onTransactionSaved={handleTransactionSaved}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Income History</CardTitle>
            </CardHeader>
            <CardContent>
              <TransactionHistory 
                workspaceId={workspaceId} 
                type="income" 
                refreshTrigger={refreshTrigger}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
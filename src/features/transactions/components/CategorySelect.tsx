import React, { useEffect } from 'react';
import useCategoryStore from '@/store/useCategoryStore';
import { Loader2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface CategorySelectProps {
  workspaceId: string;
  type: 'income' | 'expense';
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  workspaceId,
  type,
  value,
  onChange,
  placeholder = "Select category",
  disabled,
  className
}) => {
  const { 
    categories, 
    activeVersion, 
    isLoading, 
  } = useCategoryStore();

  const leafLevel = activeVersion?.levels_count || 1;
  const leafCategories = categories.filter(c => c.level === leafLevel);
  
  // Transform to options for SearchableSelect
  const options = leafCategories.map(c => ({
      label: c.name,
      value: c.id
  }));

  if (isLoading && !categories.length) {
     return (
        <div className="flex items-center space-x-2 h-10 px-3 border rounded-md text-sm text-muted-foreground bg-muted/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading categories...</span>
        </div>
     )
  }
  
  if (!activeVersion && !isLoading) {
      return (
          <div className="h-10 px-3 border rounded-md text-sm text-muted-foreground flex items-center bg-muted/50 text-red-500">
              No active category version found.
          </div>
      )
  }

  return (
    <SearchableSelect 
        options={options} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={className}
    />
  );
};

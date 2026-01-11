import React from 'react';
import useWorkspaceStore from '@/store/useWorkspaceStore';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface CurrencySelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const CurrencySelect: React.FC<CurrencySelectProps> = ({
  value,
  onChange,
  disabled,
  className
}) => {
  const { currentWorkspace } = useWorkspaceStore();
  
  // The backend returns [code, name] tuples for currency choices
  // Use optional chaining carefully
  const currencyChoices = currentWorkspace?.settings?.options?.domestic_currency;
  
  const currencyOptions = Array.isArray(currencyChoices) 
    ? currencyChoices.map(([code]) => ({ // Changed to use only code
          label: code,
          value: code
      }))
    : [];

  // Fallback if no options (e.g. not loaded yet)
  if (currencyOptions.length === 0) {
      // Potentially we could have a hardcoded fallback, but user requested backend source.
      // We can add the current value if it exists to at least show something.
      if (value) {
          currencyOptions.push({ label: value, value });
      }
  }

  return (
    <SearchableSelect
      options={currencyOptions}
      value={value}
      onChange={onChange}
      placeholder="Curr"
      disabled={disabled}
      className={className}
    />
  );
};

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { WorkspaceSwitcher } from '@/components/ui/WorkspaceSwitcher';
import useUIStore from '@/store/useUIStore';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './Breadcrumbs'; // Import the new Breadcrumbs component

export function Header({ className }: { className?: string }) {
  const { t } = useTranslation();
  // const pageTitle = useUIStore((state) => state.pageTitle); // No longer needed directly here

  return (
    <header className={cn("grid grid-cols-3 items-center h-16 px-4 md:px-8 border-b bg-white dark:bg-zinc-950", className)}>
      <div className="col-span-1">
        <Breadcrumbs />
      </div>
      <div className="col-span-1 flex justify-center">
        <WorkspaceSwitcher />
      </div>
      <div className="col-span-1 flex justify-end items-center space-x-2">
        <LanguageSwitcher />
        <Link to="/settings/user">
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">{t('nav.settings')}</span>
          </Button>
        </Link>
        {/* Other header items like user profile can go here */}
      </div>
    </header>
  );
}

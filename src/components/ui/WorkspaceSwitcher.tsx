import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Button } from '@/components/ui/button';
import { buttonVariants } from './button';
import useWorkspaceStore from '../../store/useWorkspaceStore';
import { useInspectArchivedStore } from '../../store/useInspectArchivedStore';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { CreateWorkspaceModal } from '@/features/workspaces/CreateWorkspaceModal';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isInspectingArchived } = useInspectArchivedStore();
  
  // Always fetch all workspaces to correctly determine active/archived counts
  const { data: allWorkspaces, isLoading } = useWorkspaces(true);
  
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);

  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);

  // Filter for active workspaces and determine which workspaces to display in the dropdown
  const activeWorkspaces = allWorkspaces?.filter(ws => ws.is_active) ?? [];
  
  let workspacesToShow = activeWorkspaces;
  if (isInspectingArchived && currentWorkspace) {
    // In inspection mode, show active workspaces plus the one being inspected.
    // Use a Map to ensure the inspected workspace isn't duplicated.
    const uniqueWorkspaces = new Map();
    activeWorkspaces.forEach(ws => uniqueWorkspaces.set(ws.id, ws));
    uniqueWorkspaces.set(currentWorkspace.id, currentWorkspace);
    workspacesToShow = Array.from(uniqueWorkspaces.values());
  }

  if (isLoading) {
    return (
      <button
        disabled
        className={cn(
          buttonVariants({ variant: "outline" }),
          "min-w-[200px] max-w-xs justify-between px-4 opacity-50"
        )}
      >
        {t('workspaces.loading')}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>
    );
  }

  // If there are no active workspaces AND we are not inspecting, show the "Create" button
  if (activeWorkspaces.length === 0 && !isInspectingArchived) {
    return (
      <>
        <Button
          variant="default"
          className="min-w-[200px] max-w-xs justify-center px-4"
          onClick={() => setIsCreateWorkspaceModalOpen(true)}
        >
          {t('workspaces.create.button')}
        </Button>
        <CreateWorkspaceModal
          isOpen={isCreateWorkspaceModalOpen}
          onClose={() => setIsCreateWorkspaceModalOpen(false)}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "min-w-[200px] max-w-xs justify-between px-4"
        )}
        role="combobox"
      >
        <span className="truncate">
          {currentWorkspace ? currentWorkspace.name : t('workspaces.select')}
          {currentWorkspace && !currentWorkspace.is_active && <span className="text-sm opacity-70 ml-2">({t('workspaces.archived_status_short')})</span>}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        {[...(workspacesToShow || [])].reverse().map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onSelect={() => {
              setCurrentWorkspace(workspace);
              navigate(`/${workspace.id}/dashboard`);
            }}
            className="cursor-pointer"
          >
            {workspace.name}
            {!workspace.is_active && <span className="text-xs opacity-60 ml-2">({t('workspaces.archived_status_short')})</span>}
            <Check className={`ml-auto h-4 w-4 ${currentWorkspace?.id === workspace.id ? 'opacity-100' : 'opacity-0'}`} />
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => setIsCreateWorkspaceModalOpen(true)} className="cursor-pointer text-blue-600">
          {t('workspaces.create.new')}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
      />
    </DropdownMenu>
  );
}
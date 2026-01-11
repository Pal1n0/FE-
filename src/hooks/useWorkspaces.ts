import { useQuery } from '@tanstack/react-query';
import { fetchWorkspaces } from '@/services/workspaceService';

export const useWorkspaces = (includeArchived: boolean = false, includePermissions: boolean = false) => {
  return useQuery({
    queryKey: ['workspaces', includeArchived, includePermissions],
    queryFn: () => fetchWorkspaces(includeArchived, includePermissions),
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
    retry: 3,
  });
};

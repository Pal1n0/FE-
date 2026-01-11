import apiClient from './apiClient';
import type { HardDeleteConfirmation, Workspace } from '../types'; // Import HardDeleteConfirmation and Workspace type from types/index.ts

export const fetchWorkspaces = async (includeArchived: boolean = false, includePermissions: boolean = false): Promise<Workspace[]> => {
  const params: { include_archived: boolean; include_permissions?: boolean } = {
    include_archived: includeArchived
  };
  if (includePermissions) {
    params.include_permissions = true;
  }
  const response = await apiClient.get('/api/workspaces/', {
    params: params
  });
  return response.data?.results || [];
};

export const fetchWorkspaceMembershipInfo = async (workspaceId: string) => {
  const response = await apiClient.get(`/api/workspaces/${workspaceId}/membership-info/`, {
    params: { include_archived: true }
  });
  return response.data;
};

export const createWorkspace = async (workspaceData: { name: string; description: string }) => {
  const response = await apiClient.post('/api/workspaces/', workspaceData);
  return response.data;
};

export const softDeleteWorkspace = async (workspaceId: string) => {
  // Soft delete is a DELETE request to the workspace instance, which sets is_active to false
  const response = await apiClient.delete(`/api/workspaces/${workspaceId}/`);
  return response.data;
};

export const activateWorkspace = async (workspaceId: string) => {
  // Activate is a POST request to the activate endpoint
  const response = await apiClient.post(`/api/workspaces/${workspaceId}/activate/`, null, {
    params: { include_archived: true }
  });
  return response.data;
};



export const hardDeleteWorkspace = async (workspaceId: string, confirmation: HardDeleteConfirmation) => {
  // Hard delete is a DELETE request to the hard-delete endpoint with confirmation data
  const response = await apiClient.delete(`/api/workspaces/${workspaceId}/hard-delete/`, { data: { confirmation } });
  return response.data;
};

export const updateWorkspace = async (workspaceId: string, data: { name: string; description: string }, includeArchived: boolean = false) => {
  const response = await apiClient.patch(`/api/workspaces/${workspaceId}/`, data, {
    params: { include_archived: includeArchived }
  });
  return response.data;
};

export const updateWorkspaceSettings = async (workspaceId: string, data: { domestic_currency: string; fiscal_year_start: number; display_mode: string; accounting_mode: boolean }) => {
  const response = await apiClient.patch(`/api/workspaces/${workspaceId}/settings/`, data);
  return response.data;
};

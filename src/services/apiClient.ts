// src/services/apiClient.ts
import axios from 'axios';
import useUserStore from '../store/useUserStore';
import { useInspectArchivedStore } from '../store/useInspectArchivedStore'; // Import the new store
import { toast } from 'sonner'; // Import toast for user feedback

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/';

const apiClient = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const { isInspectingArchived, inspectedWorkspaceId } = useInspectArchivedStore.getState();
    const isModifyingMethod = ['post', 'put', 'patch', 'delete'].includes(config.method as string);

    // Check if the request URL targets the inspected workspace
    const targetsInspectedWorkspace = inspectedWorkspaceId && config.url?.includes(`/workspaces/${inspectedWorkspaceId}`);

    if (isInspectingArchived && isModifyingMethod && targetsInspectedWorkspace && !config.url?.includes('/activate/')) {
      toast.error("Modifications are not allowed in archived workspace inspect mode.");
      return Promise.reject(new axios.Cancel('Operation cancelled: Cannot modify archived workspace in inspect mode.'));
    }

    const token = useUserStore.getState().token;
    console.log("API Client Interceptor: Token present?", !!token);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (axios.isCancel(error)) {
        // If it's a cancelled request, don't show toast as it's already handled
        return Promise.reject(error);
    }
    if (error.response && error.response.status === 401) {
      useUserStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;

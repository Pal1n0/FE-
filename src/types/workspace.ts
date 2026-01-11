export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner: {
    id: number;
    username: string;
    email: string;
  };
  member_count: number;
  created_at: string;
  is_active: boolean;
  settings?: WorkspaceSettings;
  user_permissions?: {
    workspace_id: string;
    workspace_name: string;
    user_id: number;
    role: 'owner' | 'editor' | 'viewer' | 'admin';
    is_owner: boolean;
    is_admin: boolean;
    permissions: {
      can_edit: boolean;
      can_delete: boolean;
      can_manage_users: boolean;
      can_impersonate: boolean;
    };
  };
}

export interface WorkspaceMembership {
  id: string;
  workspace: string;
  workspace_name: string;
  user: string;
  user_username: string;
  user_email: string;
  role: 'owner' | 'editor' | 'viewer';
  is_workspace_owner: boolean;
  joined_at: string;
}

export interface WorkspaceSettings {
  id: string;
  workspace: string;
  domestic_currency: string;
  fiscal_year_start: number;
  display_mode: string;
  accounting_mode: boolean;
  options?: {
    domestic_currency: [string, string][]; // [code, name]
    fiscal_year_start?: [number, string][];
    display_mode?: [string, string][];
  };
}

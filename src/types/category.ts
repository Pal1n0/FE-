export interface Category {
  id: string;
  name: string;
  description: string | null;
  level: number;
  is_active: boolean;
  children: Category[];
  version: CategoryVersion;
}

export interface CategoryVersion {
  id: string;
  name: string;
  description: string | null;
  levels_count: number;
  is_active: boolean;
  workspace: string;
  created_by: string;
  created_at: string;
  is_default: boolean; // Inferred from usage context if needed, or check backend
}

export interface Tag {
  id: string;
  name: string;
  workspace: string;
}

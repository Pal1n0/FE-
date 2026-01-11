

import { create } from 'zustand';


import { devtools } from 'zustand/middleware';


import apiClient from '../services/apiClient';


import { v4 as uuidv4 } from 'uuid';


import * as types from '../types';





export interface StoreCategory extends types.Category {


  temp_id?: string;


  parent_id?: string | null;


  parent_temp_id?: string | null;


}





interface CategoryStore {


  versions: types.CategoryVersion[];


  activeVersion: types.CategoryVersion | null;


  selectedVersion: types.CategoryVersion | null;


    categories: StoreCategory[];


    deletedIds: string[];


    invalidCategoryIds: string[];


    isLoading: boolean;


    error: string | null;


    isEditing: boolean;


    fetchVersions: (workspaceId: string, type: 'expense' | 'income') => Promise<void>;


    createVersion: (workspaceId: string, type: 'expense' | 'income', data: any) => Promise<void>;


    updateVersion: (workspaceId: string, type: 'expense' | 'income', versionId: string, data: Partial<types.CategoryVersion>) => Promise<void>;


    activateVersion: (workspaceId: string, type: 'expense' | 'income', versionId: string) => Promise<void>;


    fetchCategories: (workspaceId: string, type: 'expense' | 'income', versionId?: string) => Promise<void>;


    setActiveVersion: (version: types.CategoryVersion | null) => void;


    startEditing: () => void;


    stopEditing: () => void;


    saveChanges: (workspaceId: string, type: 'expense' | 'income') => Promise<void>;


    addCategory: (parentId: string | null, parentTempId: string | null, category: Partial<StoreCategory>) => void;


    updateCategory: (id: string, tempId: string | undefined, data: Partial<StoreCategory>) => void;


    deleteCategory: (id: string | undefined, tempId: string | undefined) => void;


    setCategories: (categories: StoreCategory[]) => void;


  }


  


  const useCategoryStore = create<CategoryStore>()(devtools((set, get) => ({


    versions: [],


    activeVersion: null,


    selectedVersion: null,


    categories: [],


    deletedIds: [],


    invalidCategoryIds: [],


    isLoading: false,


    error: null,


    isEditing: false,


      fetchVersions: async (workspaceId, type) => {


        set({ isLoading: true, error: null, invalidCategoryIds: [] });


        try {


          const endpoint = type === 'expense' ? 'expense-versions' : 'income-versions';


          const response = await apiClient.get(`/api/workspaces/${workspaceId}/${endpoint}/`);


          // Handle potential pagination in response


          const versions = Array.isArray(response.data) ? response.data : (response.data.results || []);


          


          const active = versions.find((v: types.CategoryVersion) => v.is_active) || null;


          set({ versions, activeVersion: active, isLoading: false });


          const currentSelected = get().selectedVersion;


          if (!currentSelected || !versions.find((v: types.CategoryVersion) => v.id === currentSelected.id)) {


              set({ selectedVersion: active });


          }


        } catch (err: any) {


          set({ error: err.message, isLoading: false });


        }


      },


      createVersion: async (workspaceId, type, data) => {


        set({ isLoading: true, error: null });


        try {


          const endpoint = type === 'expense' ? 'expense-versions' : 'income-versions';


          await apiClient.post(`/api/workspaces/${workspaceId}/${endpoint}/`, data);


          await get().fetchVersions(workspaceId, type);


        } catch (err: any) {


          set({ error: err.message, isLoading: false });


        }


      },


      updateVersion: async (workspaceId, type, versionId, data) => {


        set({ isLoading: true, error: null });


        try {


          const endpoint = type === 'expense' ? 'expense-versions' : 'income-versions';


          await apiClient.patch(`/api/workspaces/${workspaceId}/${endpoint}/${versionId}/`, data);


          await get().fetchVersions(workspaceId, type);


        } catch (err: any) {


          set({ error: err.message, isLoading: false });


        }


      },


      activateVersion: async (workspaceId, type, versionId) => {


        set({ isLoading: true, error: null });


        try {


          const endpoint = type === 'expense' ? 'expense-versions' : 'income-versions';


          await apiClient.post(`/api/workspaces/${workspaceId}/${endpoint}/${versionId}/activate/`);


          await get().fetchVersions(workspaceId, type);


          const selected = get().selectedVersion;


          if (selected && selected.id === versionId) {


              await get().fetchCategories(workspaceId, type, versionId);


          }


        } catch (err: any) {


          set({ error: err.message, isLoading: false });


        }


      },


      setActiveVersion: (version: types.CategoryVersion | null) => {


          set({ selectedVersion: version, categories: [], deletedIds: [], invalidCategoryIds: [] });


      },


          fetchCategories: async (workspaceId, type, versionId) => {


            set({ isLoading: true, error: null, invalidCategoryIds: [] });


            try {


                const endpoint = type === 'expense' ? 'expense-categories' : 'income-categories';


                const targetVersionId = versionId || get().selectedVersion?.id || get().activeVersion?.id;


                const params = targetVersionId ? { version: targetVersionId } : {};


                const response = await apiClient.get(`/api/v1/finance/${endpoint}/`, { params });


                // Handle potential pagination in response


                let categories = Array.isArray(response.data) ? response.data : (response.data.results || []);


                


                // CONVERSION: Backend Levels -> Frontend Levels


                // Backend: (5 - N + 1) .. 5  (where N is levels_count)


                // Frontend: 1 .. N


                // Shift = 5 - N


                const selectedVersion = get().versions.find(v => v.id === targetVersionId);


                const levelsCount = selectedVersion?.levels_count || 5;


                const shift = 5 - levelsCount;


      


                if (shift > 0) {


                    categories = categories.map((c: any) => ({


                        ...c,


                        level: c.level - shift


                    }));


                }


      


                set({ categories: categories, deletedIds: [], isLoading: false });


            } catch (err: any) {


              set({ error: err.message, isLoading: false });


            }


          },


        startEditing: () => set({ isEditing: true, deletedIds: [], invalidCategoryIds: [] }),


        stopEditing: () => {


            set({ isEditing: false, deletedIds: [], invalidCategoryIds: [] });


        },


        saveChanges: async (workspaceId, type) => {


          set({ isLoading: true, error: null, invalidCategoryIds: [] });


          const currentCategories = get().categories;


          const deletedIds = get().deletedIds;


          const selectedVersion = get().selectedVersion;


          if (!selectedVersion) {


              set({ error: "No version selected to save to.", isLoading: false });


              return;


          }


      


              // CONVERSION: Frontend Levels -> Backend Levels


      


              // Backend = Frontend + Shift


      


              const levelsCount = selectedVersion.levels_count || 5;


      


              const shift = 5 - levelsCount;


      


          


      


              // VALIDATION: Ensure all branches reach the required depth


      


              // Build a map to check for children


      


              const childMap = new Map<string, boolean>();


      


              currentCategories.forEach(c => {


      


                  const pId = c.parent_id || c.parent_temp_id;


      


                  if (pId) childMap.set(pId, true);


      


              });


      


          


      


              const invalidLeaves = currentCategories.filter(c => {


      


                  // It is a leaf if it's not in childMap (no one claims it as parent)


      


                  const isLeaf = !childMap.has(c.id || c.temp_id || '');


      


                  // If it is a leaf, it MUST be at the max level (levelsCount)


      


                  return isLeaf && c.level !== levelsCount;


      


              });


      


          


      


              if (invalidLeaves.length > 0) {


      


                  const names = invalidLeaves.map(c => c.name).join(", ");


                  const ids = invalidLeaves.map(c => c.id || c.temp_id || '');


      


                  set({ 


                      error: `Validation Failed: All branches must reach level ${levelsCount}. Incomplete categories: ${names}`, 


                      isLoading: false,


                      invalidCategoryIds: ids


                  });


      


                  return;


      


              }


      


          


      


                          const createList = currentCategories.filter(c => c.temp_id).map(c => ({


      


          


      


                          temp_id: c.temp_id,


      


          


      


                          name: c.name,


      


          


      


                          description: c.description,


      


          


      


                          level: c.level + shift,


      


          


      


                          parent_temp_id: c.parent_temp_id,


      


          


      


                          parent_id: c.parent_id


      


          


      


                      }));


      


          


      


                      const updateList = currentCategories.filter(c => c.id && !c.temp_id).map(c => ({


            id: c.id,


            name: c.name,


            description: c.description,


            level: c.level + shift,


            parent_id: c.parent_id


        }));


        const payload = {


            create: createList,


            update: updateList,


            delete: deletedIds


        };


        try {


            const endpoint = type === 'expense' ? 'expense-versions' : 'income-versions';


            await apiClient.post(`/api/workspaces/${workspaceId}/${endpoint}/${selectedVersion.id}/sync/`, payload);


            await get().fetchCategories(workspaceId, type, selectedVersion.id);


            set({ isEditing: false, isLoading: false, deletedIds: [] });


        } catch (err: any) {


            set({ error: err.message, isLoading: false });


        }


      },


  addCategory: (parentId, parentTempId, categoryData) => {


    const selectedVersion = get().selectedVersion;


    if (!selectedVersion) {


      console.error("Cannot add category, no version selected");


      return;


    }


        const newCategory: StoreCategory = {


            id: "",


            temp_id: uuidv4(),


            name: categoryData.name || "",


            description: categoryData.description || "",


            level: categoryData.level || 1,


        parent_id: parentId,


        parent_temp_id: parentTempId,


        children: [],


        is_active: true,


        version: selectedVersion


    };


    set(state => ({


        categories: [...state.categories, newCategory]


    }));


  },


  updateCategory: (id, tempId, data) => {


    set(state => ({


        categories: state.categories.map(c => {


            if ((id && c.id === id) || (tempId && c.temp_id === tempId)) {


                return { ...c, ...data };


            }


            return c;


        })


    }));


  },


  deleteCategory: (id, tempId) => {


    set(state => {


        const newCategories = state.categories.filter(c => {


            if (id) return c.id !== id;


            if (tempId) return c.temp_id !== tempId;


            return true;


        });


        let newDeletedIds = state.deletedIds;


        if (id) {


            newDeletedIds = [...newDeletedIds, id];


        }


        return {


            categories: newCategories,


            deletedIds: newDeletedIds


        };


    });


  },


  setCategories: (categories) => set({ categories }),


}), { name: 'CategoryStore' }));





export default useCategoryStore;

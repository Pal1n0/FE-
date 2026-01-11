
import React from 'react';
import useCategoryStore from '../../store/useCategoryStore';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Trash2, Edit2, Plus } from 'lucide-react';

type StoreCategory = ReturnType<typeof useCategoryStore.getState>['categories'][0];

const CategoryNode = ({ category, isLastChild = false }: { category: StoreCategory, isLastChild?: boolean }) => {
    const { updateCategory, deleteCategory, addCategory, isEditing: isGlobalEditing, selectedVersion, invalidCategoryIds, categories } = useCategoryStore();
    const [isExpanded, setIsExpanded] = React.useState(true);
    const [isLocalEditing, setIsLocalEditing] = React.useState(!category.name);
    const [editName, setEditName] = React.useState(category.name);

    const hasChildren = category.children && category.children.length > 0;
    const maxLevel = selectedVersion?.levels_count || 5;

    const isInvalid = invalidCategoryIds.includes(category.id || '') || (category.temp_id && invalidCategoryIds.includes(category.temp_id));
    const isNew = !!category.temp_id;

    const handleSave = () => {
        const trimmedName = editName.trim();
        if (!trimmedName) return; // Prevent empty names

        // Validation: Unique Sibling Name
        const siblings = categories.filter(c => {
            // Must be different ID/TempID
            const isSelf = (c.id && c.id === category.id) || (c.temp_id && c.temp_id === category.temp_id);
            if (isSelf) return false;

            // Must have same parent
            const sameParent = (c.parent_id === category.parent_id) && (c.parent_temp_id === category.parent_temp_id);
            return sameParent;
        });

        const isDuplicate = siblings.some(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase());
        if (isDuplicate) {
            alert(`Category "${trimmedName}" already exists in this level.`);
            return;
        }

        updateCategory(category.id, category.temp_id, { name: trimmedName });
        setIsLocalEditing(false);
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this category?")) {
            deleteCategory(category.id, category.temp_id);
        }
    };

    const handleAddChild = () => {
        if (category.level >= maxLevel) return;
        addCategory(category.id || null, category.temp_id || null, { level: category.level + 1 });
        setIsExpanded(true);
    };

    return (
        <div className="relative">
            {/* Connection Line for this node (horizontal) */}
            <div className="absolute -left-3 top-4 w-3 h-px bg-border/60" />

            <div
                className={`flex items-center p-2 mb-1 rounded-md group border transition-all duration-200 ${
                    isInvalid
                        ? "bg-destructive/10 border-destructive/50 text-destructive hover:bg-destructive/20"
                        : isNew
                            ? "bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100"
                            : "bg-card border-transparent hover:border-border hover:bg-accent/50 hover:shadow-sm"
                }`}
            >
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`mr-2 p-1 rounded-md hover:bg-black/5 transition-colors ${hasChildren ? 'text-foreground/70' : 'opacity-0 pointer-events-none'}`}
                >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {isLocalEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                        <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex-1 h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                            placeholder="Enter category name"
                            onBlur={handleSave}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                ) : (
                    <span className="flex-1 font-medium text-sm flex items-center gap-2 select-none">
                        {category.name}
                        {category.level > 0 && (
                             <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isInvalid ? "text-destructive/70 bg-destructive/10" : isNew ? "text-blue-700/70 bg-blue-100/50" : "text-muted-foreground/50 bg-secondary/50"}`}>
                                L{category.level}
                            </span>
                        )}
                        {isNew && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                                New
                            </span>
                        )}
                        {isInvalid && (
                            <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-bold">
                                Incomplete
                            </span>
                        )}
                    </span>
                )}

                {isGlobalEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-background/80 hover:text-primary" onClick={() => setIsLocalEditing(true)} title="Edit name">
                            <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {category.level < maxLevel && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-background/80 hover:text-green-600" onClick={handleAddChild} title="Add subcategory">
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-background/80 hover:text-red-500" onClick={handleDelete} title="Delete category">
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>

            {isExpanded && hasChildren && (
                <div className="relative ml-4 pl-3 border-l border-border/60 space-y-1">
                    {category.children.map((child, idx) => (
                        <CategoryNode 
                            key={child.id || child.temp_id} 
                            category={child as StoreCategory} 
                            isLastChild={idx === category.children.length - 1} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const CategoryTree = () => {
    const { categories, addCategory, selectedVersion, isEditing } = useCategoryStore();

    // Transform flat list to tree
    const buildTree = (cats: StoreCategory[]) => {
        const map: Record<string, StoreCategory> = {};
        const roots: StoreCategory[] = [];

        // Initialize map
        cats.forEach(c => {
            map[c.id || c.temp_id!] = { ...c, children: [] };
        });

        // Build hierarchy
        cats.forEach(c => {
            const node = map[c.id || c.temp_id!];
            if (c.parent_id || c.parent_temp_id) {
                const parent = map[c.parent_id! || c.parent_temp_id!];
                if (parent) {
                    parent.children.push(node);
                } else {
                    roots.push(node); // Orphan or parent not found
                }
            } else {
                roots.push(node);
            }
        });
        return roots;
    };

    const treeData = React.useMemo(() => buildTree(categories), [categories]);

    return (
        <div className="space-y-4">
            <div className="flex justify-end mb-4">
                {isEditing && (
                    <Button size="sm" onClick={() => addCategory(null, null, { level: 1 })} disabled={!selectedVersion} className="shadow-sm">
                        <Plus className="h-4 w-4 mr-1" /> Add Root Category
                    </Button>
                )}
            </div>

            <div className="rounded-lg border bg-card/30 p-6 min-h-[400px]">
                {treeData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <div className="p-3 rounded-full bg-accent/50 mb-3">
                            <Plus className="h-6 w-6 opacity-50" />
                        </div>
                        <p>No categories found.</p>
                        <p className="text-sm opacity-70">Create a root category to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-2 pl-2">
                        {treeData.map((node, idx) => (
                            <CategoryNode 
                                key={node.id || node.temp_id} 
                                category={node} 
                                isLastChild={idx === treeData.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

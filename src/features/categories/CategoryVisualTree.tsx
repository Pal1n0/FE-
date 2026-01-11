import React, { useMemo, useState } from 'react';
import useCategoryStore, { type StoreCategory } from '../../store/useCategoryStore';
import { Plus, Minus, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TreeNode {
    category: StoreCategory;
    x: number;
    y: number;
    width: number;
    children: TreeNode[];
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 40;
const HORIZONTAL_SPACING = 15;
const VERTICAL_SPACING = 60;

interface CategoryVisualTreeProps {
    onAddChild?: (parentId: string | null, parentTempId: string | null, level: number) => void;
    isEditing?: boolean;
}

export const CategoryVisualTree = ({ onAddChild, isEditing }: CategoryVisualTreeProps) => {
    const { categories } = useCategoryStore();
    const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    // Transform flat list to tree structure for layout
    const treeStructure = useMemo(() => {
        const map: Record<string, StoreCategory & { children: any[] }> = {};
        const roots: any[] = [];

        // Initialize map
        categories.forEach(c => {
            map[c.id || c.temp_id!] = { ...c, children: [] };
        });

        // Build hierarchy
        categories.forEach(c => {
            const node = map[c.id || c.temp_id!];
            if (c.parent_id || c.parent_temp_id) {
                const parent = map[c.parent_id! || c.parent_temp_id!];
                if (parent) {
                    parent.children.push(node);
                } else {
                    roots.push(node);
                }
            } else {
                roots.push(node);
            }
        });
        return roots;
    }, [categories]);

    // Calculate layout positions
    const layoutTree = useMemo(() => {
        const calculateNodePositions = (node: any, level: number, startX: number): TreeNode => {
            const childrenNodes: TreeNode[] = [];
            let currentX = startX;
            let totalWidth = 0;

            if (node.children.length === 0) {
                totalWidth = NODE_WIDTH + HORIZONTAL_SPACING;
            } else {
                node.children.forEach((child: any) => {
                    const childNode = calculateNodePositions(child, level + 1, currentX);
                    childrenNodes.push(childNode);
                    currentX += childNode.width;
                    totalWidth += childNode.width;
                });
            }

            // Center parent above children
            const x = startX + (totalWidth - HORIZONTAL_SPACING) / 2 - NODE_WIDTH / 2;
            
            return {
                category: node,
                x,
                y: level * VERTICAL_SPACING + 50,
                width: totalWidth,
                children: childrenNodes
            };
        };

        let currentRootX = 0;
        return treeStructure.map(root => {
            const node = calculateNodePositions(root, 0, currentRootX);
            currentRootX += node.width + HORIZONTAL_SPACING * 2; // Extra gap between trees
            return node;
        });
    }, [treeStructure]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPan({ x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setViewTransform(prev => ({
            ...prev,
            x: e.clientX - startPan.x,
            y: e.clientY - startPan.y
        }));
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        // Simple zoom
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, viewTransform.scale + scaleAmount), 3);
        setViewTransform(prev => ({ ...prev, scale: newScale }));
    };

    const handleZoomIn = () => {
        setViewTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 3) }));
    };

    const handleZoomOut = () => {
        setViewTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.1) }));
    };

    const renderNode = (node: TreeNode) => {
        return (
            <g key={node.category.id || node.category.temp_id}>
                {/* Edges to children */}
                {node.children.map(child => {
                    const startX = node.x + NODE_WIDTH / 2;
                    const startY = node.y + NODE_HEIGHT;
                    const endX = child.x + NODE_WIDTH / 2;
                    const endY = child.y;
                    
                    const controlY1 = startY + VERTICAL_SPACING / 2;
                    const controlY2 = endY - VERTICAL_SPACING / 2;

                    return (
                        <path
                            key={`edge-${node.category.id}-${child.category.id}`}
                            d={`M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`}
                            stroke="#cbd5e1"
                            strokeWidth="2"
                            fill="none"
                        />
                    );
                })}

                {/* Node Card - Height increased to accommodate button overflow */}
                {/* We give +40px height to foreignObject to allow the absolute button to be visible below the card */}
                <foreignObject x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEIGHT + 40}>
                    <div 
                        style={{ height: NODE_HEIGHT }}
                        className={`
                            w-full px-2 rounded-md border bg-card shadow-sm flex items-center justify-between group
                            hover:ring-2 hover:ring-primary/20 transition-all select-none cursor-pointer relative
                            ${node.category.temp_id ? "border-blue-200 bg-blue-50" : "border-border"}
                        `}
                    >
                        <div className="text-xs font-medium truncate flex-1 text-center leading-tight">
                            {node.category.name || <span className="text-muted-foreground italic">Unnamed</span>}
                        </div>
                        
                        <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm z-10">
                            {node.category.level}
                        </div>

                        {/* Add Child Button (only visible when editing) */}
                        {isEditing && (
                            <button 
                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-600 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center"
                                style={{ width: '20px', height: '20px' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddChild?.(node.category.id || null, node.category.temp_id || null, node.category.level);
                                }}
                                title="Add Subcategory"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </foreignObject>

                {/* Recursively render children */}
                {node.children.map(renderNode)}
            </g>
        );
    };

    return (
        <div 
            className="w-full h-full min-h-[600px] bg-slate-50/50 rounded-lg border overflow-hidden relative cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onWheel={handleWheel}
        >
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none z-10">
                <div className="bg-background/80 backdrop-blur p-2 rounded-md border text-xs text-muted-foreground">
                    Scroll to Zoom • Drag to Pan {isEditing && "• Hover node to Add Child"}
                </div>
                <div className="flex flex-col gap-1 pointer-events-auto">
                    <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm border" onClick={handleZoomIn}>
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm border" onClick={handleZoomOut}>
                        <Minus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            <svg width="100%" height="100%">
                <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
                    {layoutTree.map(renderNode)}
                </g>
            </svg>
        </div>
    );
};

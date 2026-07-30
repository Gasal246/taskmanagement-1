"use client"

import { FormEvent, useEffect, useState } from 'react';
import { Popconfirm } from 'antd';
import { EllipsisVertical, PencilRuler, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUpdateHierarchyItem } from '@/query/business/queries';
import type { HierarchyItemType } from '@/query/business/functions';

interface HierarchyItemActionsProps {
    id?: string;
    name?: string;
    itemLabel: string;
    entityType: HierarchyItemType;
    onDelete: () => Promise<unknown>;
    onUpdated: (item: any) => void;
}

const HierarchyItemActions = ({
    id,
    name = '',
    itemLabel,
    entityType,
    onDelete,
    onUpdated,
}: HierarchyItemActionsProps) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [input, setInput] = useState(name);
    const { mutateAsync: updateItem, isPending: updating } = useUpdateHierarchyItem();

    useEffect(() => setInput(name), [name]);

    const openEditDialog = () => {
        setInput(name);
        setPopoverOpen(false);
        setEditOpen(true);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedName = input.trim();
        if (!id || !trimmedName) {
            return toast.error(`${itemLabel} name is required.`);
        }

        const response = await updateItem({ id, name: trimmedName, entity_type: entityType });
        if (response?.status !== 200) {
            return toast.error(response?.error || `Failed to update ${itemLabel.toLowerCase()}.`);
        }

        onUpdated(response.data);
        setEditOpen(false);
        toast.success(response?.message || `${itemLabel} updated successfully.`);
    };

    const handleDelete = async () => {
        setPopoverOpen(false);
        await onDelete();
    };

    return (
        <>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${itemLabel} actions`}
                        className="absolute right-3 top-2 h-8 w-8 rounded-full hover:bg-slate-700/50"
                    >
                        <EllipsisVertical size={20} />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[120px] overflow-hidden rounded-lg border border-slate-800 p-0">
                    <div className="space-y-1 rounded-lg bg-black p-0.5">
                        <button
                            type="button"
                            onClick={openEditDialog}
                            className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-1 py-2 text-purple-500 hover:text-purple-400"
                        >
                            <PencilRuler size={14} />
                            <span className="text-xs font-semibold">Edit</span>
                        </button>
                        <Popconfirm
                            title={`Delete ${itemLabel}?`}
                            description={`This will remove ${name || `this ${itemLabel.toLowerCase()}`} and its access from this hierarchy.`}
                            okText="Delete Anyway"
                            cancelText="Cancel"
                            onConfirm={handleDelete}
                        >
                            <button
                                type="button"
                                className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-1 py-2 text-red-500 hover:text-red-400"
                            >
                                <Trash2 size={14} />
                                <span className="text-xs font-semibold">Delete</span>
                            </button>
                        </Popconfirm>
                    </div>
                </PopoverContent>
            </Popover>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit {itemLabel} Information</DialogTitle>
                        <DialogDescription>Change the name of {name || `this ${itemLabel.toLowerCase()}`}.</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <Input
                            autoFocus
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder={`${itemLabel} name`}
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={updating || !input.trim()}>
                                {updating ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default HierarchyItemActions;

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
 
import { Avatar, Tooltip } from "antd"
import Link from "next/link"

// const RemoveStaffButton = ({ staffid, departmentId }:{ staffid: string, departmentId: string }) => {
//     const { mutateAsync: removeDepStaff, isPending: removingDepStaff } = useRemoveDepStaff();
//     const handleRemoveStaff = async () => {
//         const response = await removeDepStaff({ depid: departmentId, staffid: staffid });
//     }
//     return (
//         <h1 onClick={handleRemoveStaff}>Remove Staff</h1>
//     )
// }

export const columns: ColumnDef<any>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "avatar_url",
        header: () => <div className="text-left">Avatar</div>,
        cell: ({ row }) => {
            const avatarUrl = row.getValue("avatar_url");
            return (
                <Tooltip title={avatarUrl ? 'user-profile' : 'default avatar'}>
                    <Avatar src={avatarUrl ? `${avatarUrl}` : '/avatar.png'} />
                </Tooltip>
            )
        },
    },
    {
        accessorKey: "Name",
        header: ({ column }) => {
            return (
                <h1 className="flex items-center" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} > 
                    Name <ArrowUpDown className="ml-2 h-4 w-4" />
                </h1>
            )
        },
    },
    {
        accessorKey: "Email",
        header: ({ column }) => {
            return (
                <h1
                    className="flex items-center"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </h1>
            )
        },
    },
    {
        accessorKey: "Region.RegionName",
        header: ({ column }) => {
            return (
                <h1 className="flex items-center" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} >
                    Region<ArrowUpDown className="ml-2 h-4 w-4" />
                </h1>
            )
        },
    },
    {
        accessorKey: "Area.Areaname",
        header: ({ column }) => {
            return (
                <h1 className="flex items-center" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} >
                    Area<ArrowUpDown className="ml-2 h-4 w-4" />
                </h1>
            )
        },
    },
    {
        accessorKey: "Role",
        header: ({ column }) => {
            return (
                <h1 className="flex items-center capitalize" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}> 
                    Role <ArrowUpDown className="ml-2 h-4 w-4" />
                </h1>
            )
        },
    },
    {
        accessorKey: "Status",
        header: ({ column }) => {
            return (
                <h1 className="flex items-center" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}> 
                    Status <ArrowUpDown className="ml-2 h-4 w-4" />
                </h1>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const staff: any = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    {/* <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(staff?._id)}
                        >
                            <Tooltip title={staff?._id}>Copy Staff ID</Tooltip>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <Link href={`/admin/staffs/${staff?._id}`}><DropdownMenuItem>View staff</DropdownMenuItem></Link>
                        <DropdownMenuItem ><RemoveStaffButton staffid={staff?._id} departmentId={staff?.departmentId} /></DropdownMenuItem>
                    </DropdownMenuContent> */}
                </DropdownMenu>
            )
        },
    },
]
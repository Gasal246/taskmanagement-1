"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "antd";
import { useActivateDeactivateEqAgents, useGetEqUserProfile, useRemoveEqUsers } from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AgentDetailsPage() {
    const router = useRouter();

    const params = useParams<{ user_id: string }>();

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);

    const { data: user_profile, isLoading, refetch } = useGetEqUserProfile(params.user_id);
    const { mutateAsync: ActAgent, isPending } = useActivateDeactivateEqAgents();
    const { mutateAsync: DeleteUser, isPending: isDeleting} = useRemoveEqUsers();

    useEffect(() => {
        console.log("profile: ", user_profile);
    }, [user_profile]);

    const toggleUser = async () => {
        const res = await ActAgent(user_profile?.user?._id);
        if (res?.status == 200) {
            toast.success(res?.message);
        } else {
            toast.error(res?.message);
        }
        refetch();
    }

    const DeleteUserAsync = async()=> {
        const res = await DeleteUser(params.user_id);
        if(res?.status == 200){
            toast.success(res?.message);
            return router.replace("/admin/enquiries/users")
        }
        toast.error(res?.message || "Failed to delete user");
    }

    return (
        <div className="p-6 text-slate-200">

            {/* TOP ACTION BAR */}
            <div className="flex justify-between items-center mb-5">

                {/* Back Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.replace("/admin/enquiries/users")}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={16} /> Back
                </motion.button>

                {/* USER LOGS BUTTON */}
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push(`/admin/enquiries/users/${params.user_id}/logs`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 
               hover:border-cyan-500 bg-gradient-to-tr from-slate-900 to-slate-800 
               text-sm font-semibold text-slate-200"
                >
                    <UserCircle2 size={16} />
                    User Logs
                </motion.button>

            </div>

            {/* USER CARD */}
            <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 rounded-xl mb-6 flex justify-between items-center border border-slate-700">

                {/* LEFT SIDE - USER INFO */}
                <div className="flex gap-4 items-center">
                    <Avatar size={60} src="https://api.dicebear.com/7.x/personas/svg" />

                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {user_profile?.user?.name}
                        </h2>
                        <p className="text-sm text-slate-400">{user_profile?.user?.email}</p>
                        <p className="text-sm text-slate-400">{user_profile?.user?.phone}</p>
                    </div>
                </div>

                {/* RIGHT SIDE - ACTION BUTTONS */}
                <div className="flex gap-3">
                    <Button
                        onClick={toggleUser}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition
                                ${user_profile?.user?.status == 1
                                ? "bg-white hover:bg-slate-500 text-black"
                                : "bg-green-600 hover:bg-green-500 text-white"
                            }`}
                    >
                        {user_profile?.user?.status == 1 ? "Deactivate" : "Activate"}
                    </Button>

                    <Button
                        onClick={()=> setDeleteModalOpen(true)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-rose-700 hover:bg-rose-600 text-white transition"
                    >
                        Delete
                    </Button>
                </div>

            </div>



            {/* ENQUIRIES LIST */}
            <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 rounded-lg border border-slate-800">
                <h3 className="text-md font-semibold flex items-center gap-2 mb-3">
                    <FileText size={16} /> Enquiries Handled ({user_profile?.enquiries?.length})
                </h3>

                {user_profile?.enquiries?.length === 0 ? (
                    <p className="text-sm text-slate-500">No enquiries assigned.</p>
                ) : (
                    <div className="space-y-2">
                        {user_profile?.enquiries?.map((item: any, index: number) => {
                            const enq = item.enquiry;

                            return (
                                <motion.div
                                    key={index}
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() =>
                                        router.push(`/admin/enquiries/${enq?.enquiry?._id}`)
                                    }
                                    className="border border-slate-700 hover:border-slate-500 p-3 rounded-lg cursor-pointer bg-slate-900/40"
                                >
                                    <h4 className="font-medium text-sm">
                                        {item?.camp?.camp_name || "Unknown Camp"}
                                    </h4>

                                    <div className="text-xs text-slate-400 mt-1 space-y-1">
                                        <p>
                                            <span className="font-medium text-slate-300">
                                                Status:
                                            </span>{" "}
                                            {enq?.status}
                                        </p>

                                        <p>
                                            <span className="font-medium text-slate-300">
                                                Priority:
                                            </span>{" "}
                                            {enq?.priority}
                                        </p>

                                        <p>
                                            <span className="font-medium text-slate-300">
                                                Step:
                                            </span>{" "}
                                            {item.step_number}
                                        </p>

                                        <p>
                                            <span className="font-medium text-slate-300">
                                                Action:
                                            </span>{" "}
                                            {item.action}
                                        </p>

                                        <p>
                                            <span className="font-medium text-slate-300">
                                                Assigned On:
                                            </span>{" "}
                                            {new Date(enq?.createdAt).toLocaleDateString()}
                                        </p>

                                        {item.next_step_date && (
                                            <p>
                                                <span className="font-medium text-slate-300">
                                                    Next Action:
                                                </span>{" "}
                                                {new Date(item?.next_step_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete confirmation Modal */}
                        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                            <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
                                 <DialogHeader>
                                    <DialogTitle>Delete User</DialogTitle>
                                </DialogHeader>
                                
                                <p className="text-red-400 font-semibold">Proceeding with this action will remove the user from enquiry manager.</p>
            
                                <DialogFooter className="mt-4">
                                            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                            disabled={isDeleting}
                                            onClick={DeleteUserAsync}>{isDeleting ? "Deleting" : "Delete"}</Button>
                                        </DialogFooter>
                            </DialogContent>
                        </Dialog>
        </div>
    );
}

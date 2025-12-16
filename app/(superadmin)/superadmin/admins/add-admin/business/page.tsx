/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect, useState } from 'react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb";
import { toast } from 'sonner';
import { motion } from "framer-motion";
import { Popconfirm, Tooltip } from "antd";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog"
import { Blocks, FilePlus2, PackagePlus, Trash2, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatDateTiny } from "@/lib/utils";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useRouter } from 'next/navigation';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/firebase/config';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { useGetPlans } from '@/query/superadmin/query';
import { useAddBusinessDetails } from '@/query/business/queries';

const AdminBusinessDetails = () => {
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);
    const [openAddAdmin, setOpenAddAdmin] = useState(false);
    const [openAddDoc, setOpenAddDoc] = useState(false);
    const [openAddPlan, setOpenAddPlan] = useState(false);
    const [openAddCustomPlan, setOpenAddCustomPlan] = useState(false);

    const { data: businessPlans, isLoading: loadingPlans } = useGetPlans();
    const { mutateAsync: addBusinessDetails, isPending: addingBusinessDetails } = useAddBusinessDetails();

    const { businessAdded, businessPlan, businessAdmins, businessDocs } = useSelector((state: RootState) => state.application);
    useEffect(() => {
        if (!businessAdded) {
            router.back();
        }
        if (businessPlan) {
            setSelectedPlan(businessPlan?.plan_id);
        }
        if (businessAdmins) {
            setAdminList(businessAdmins);
        }
        if (businessDocs) {
            setDocList(businessDocs);
        }
    }, [businessAdded]);

    const [adminList, setAdminList] = useState<any[]>([]);
    const [admin_name, setAdminName] = useState('');
    const [admin_email, setAdminEmail] = useState('');
    const [admin_phone, setAdminPhone] = useState('');
    const handleAddAdmins = () => {
        if (!admin_name || !admin_email || !admin_phone) {
            toast.error("Please fill all the required fields", {
                duration: 3000,
                description: 'make sure you have filled the inputs before continuing',
            })
            return;
        }
        setAdminList((prev) => [...prev, { admin_name, admin_email, admin_phone }])
        setAdminName('');
        setAdminEmail('');
        setAdminPhone('');
        setOpenAddAdmin(false);
    };

    const [docList, setDocList] = useState<any[]>([]);
    const [doc_name, setDocName] = useState('');
    const [doc_expire_date, setDocExpireDate] = useState('');
    const [doc_file, setDocFile] = useState<File | null>(null);
    const handleAddDocs = async () => {
        if (!doc_name || !doc_expire_date || !doc_file) {
            toast.error("Please fill all the required fields", {
                duration: 3000,
                description: 'make sure you have filled the inputs before continuing',
            })
            return;
        }
        setDocList((prev) => [...prev, { doc_name: doc_name?.replace(/\s/g, '_'), expires_at: doc_expire_date, doc_file }])
        setDocName('');
        setDocExpireDate('');
        setDocFile(null);
        setOpenAddDoc(false);
    };

    const handleRemoveDoc = (index: number) => {
        // remove uploaded doc from firbase and remove from list
        const docRef = ref(storage, `business-docs/${businessAdded?._id}/${docList[index]?.doc_name}`);
        try {
            deleteObject(docRef);
        } catch (error) {
            console.log(error);
            toast.error("Failed to remove document", {
                duration: 3000,
                description: 'something went wrong. check server logs.',
            })
        }
        setDocList((prev) => prev.filter((_, i) => i !== index))
    };

    const [selectedPlan, setSelectedPlan] = useState<any>();
    const [customPlan, setCustomPlan] = useState<any>();
    const handleClickAddCustomPlan = () => {
        setCustomPlan(null)
        setOpenAddPlan(false);
        setOpenAddCustomPlan(true);
    }

    const handleSelectPlan = (plan: any) => {
        setSelectedPlan(plan);
        setOpenAddPlan(false);
    }

    const handleAddCustomPlan = () => {
        if (!customPlan?.plan_name || !customPlan?.staff_count || !customPlan?.regions_count || !customPlan?.deps_count) {
            toast.error("Please fill all the required fields", {
                duration: 3000,
                description: 'make sure you have filled the inputs before continuing',
            })
            return;
        }
        setSelectedPlan({ ...customPlan, is_custom: true });
        setOpenAddCustomPlan(false);
    }

    const handleAddToBusiness = async () => {
        setLoading(true);
        if (!selectedPlan) {
            toast.error("Please select a plan", {
                duration: 3000,
                description: 'make sure you have selected a plan before continuing',
            })
            return;
        }

        const docFileList = docList.filter((doc) => doc?.doc_file);
        let doclist: any[] = []
        if(docFileList.length > 0) {
            const docs = await Promise.all(docFileList.map(async (doc) => {
                const imageRef = ref(storage, `business-docs/${businessAdded?._id}/${doc?.doc_name?.replace(/\s/g, '_')}`);
                try {
                    await uploadBytes(imageRef, doc?.doc_file)
                    const docUrl = await getDownloadURL(imageRef);
                    return { doc_name: doc?.doc_name?.replace(/\s/g, '_'), doc_url: docUrl, expires_at: doc?.expires_at }
                } catch (error) {
                    console.log(error);
                    toast.error("Failed to upload document", {
                        duration: 3000,
                        description: 'something went wrong. check server logs.',
                    })
                }
            }));
            doclist = docs;
        };

        try {
            const formData = new FormData();
            formData.append('body', JSON.stringify({
                business_id: businessAdded?._id,
                business_plan: selectedPlan,
                business_admins: adminList,
                business_docs: doclist
            }));
            await addBusinessDetails(formData);
            toast.success("Plan added to business successfully", {
                duration: 3000,
                description: 'Plan added to business successfully',
            })
            router.back();
        } catch (error) {
            console.log(error);
            toast.error("Failed to add plan to business", {
                duration: 3000,
                description: 'something went wrong. check server logs.',
            })
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`p-5 overflow-y-scroll h-[90dvh] pb-20 ${loading && 'blur-lg'}`}>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.back()}>Business</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Add Business</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mt-3">
                <h1 className='text-lg font-semibold mb-2 bg-slate-950/50 rounded-lg p-3 flex items-center gap-1'><Blocks size={20} /> Continue Adding Business</h1>
                <div className="space-y-3 bg-slate-950/50 p-3 rounded-lg pb-5">

                    {/* BUSINESS PLAN */}
                    <div>
                        <h1 className="text-sm font-semibold mb-1 mx-1">Business Plan</h1>
                        <div className="w-full flex flex-wrap mb-1">
                            <div className="w-3/12 p-1">
                                {selectedPlan && <div className="bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-3 rounded-lg relative">
                                    <h1 className="text-lg font-semibold text-slate-200">{selectedPlan?.plan_name}</h1>
                                    <p className="text-sm text-slate-200">Staffs: <span className="text-slate-400">{selectedPlan?.staff_count}</span></p>
                                    <p className="text-sm text-slate-200">Regions: <span className="text-slate-400">{selectedPlan?.regions_count}</span></p>
                                    <p className="text-sm text-slate-200">Departments: <span className="text-slate-400">{selectedPlan?.deps_count}</span></p>
                                    <div className="absolute top-2 right-2 cursor-pointer">
                                        <Tooltip title="Remove Doc ?"><Trash2 className="hover:text-red-900" size={20} onClick={() => setSelectedPlan(null)} /></Tooltip>
                                    </div>
                                </div>}
                            </div>
                        </div>
                        <Dialog open={openAddPlan} onOpenChange={setOpenAddPlan}>
                            <DialogTrigger>
                                {!selectedPlan && <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.05 }} className="mx-1 flex items-center justify-center w-[200px] bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-2 rounded-lg gap-2 cursor-pointer">
                                    <PackagePlus size={18} />
                                    <h1 className="text-sm">Choose Plan</h1>
                                </motion.div>}
                            </DialogTrigger>
                            <DialogContent className="lg:max-w-[450px] max-h-[500px] overflow-y-scroll">
                                <DialogHeader>
                                    <DialogTitle>Select or add custom plan</DialogTitle>
                                    <DialogDescription>Choose a plan or add a custom plan for this business</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <div className="w-full flex flex-col gap-1">
                                        {businessPlans?.map((plan: any) =>
                                            <motion.div key={plan?._id} whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.05 }} className="bg-gradient-to-br border border-slate-700 hover:border-cyan-600 from-slate-900 to-slate-800 p-3 rounded-lg cursor-pointer"
                                                onClick={() => handleSelectPlan(plan)}
                                            >
                                                <h1 className='text-lg font-semibold text-slate-200'>{plan.plan_name}</h1>
                                                <p className="text-sm text-slate-200">Departments: <span className="text-slate-400">{plan.deps_count}</span></p>
                                                <p className="text-sm text-slate-200">Staffs: <span className="text-slate-400">{plan.staff_count}</span></p>
                                                <p className="text-sm text-slate-200">Regions: <span className="text-slate-400">{plan.regions_count}</span></p>
                                            </motion.div>
                                        )}
                                    </div>
                                    <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.05 }} className="bg-gradient-to-br border border-slate-700 hover:border-cyan-600 from-slate-900 to-slate-800 p-3 rounded-lg text-center text-sm font-semibold cursor-pointer"
                                        onClick={handleClickAddCustomPlan}
                                    >
                                        Make Custom Plan
                                    </motion.div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* BUSINESS ADMINS */}
                    <div>
                        <h1 className="text-sm font-semibold mb-1 mx-1">Business Admins</h1>
                        <div className="w-full flex flex-wrap mb-1">
                            {adminList.map((admin, index) => <div key={index} className="w-3/12 p-1">
                                <div className="bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-3 rounded-lg relative">
                                    <h1 className="text-lg font-semibold text-slate-200">{admin.admin_name}</h1>
                                    <p className="text-sm text-slate-200">{admin.admin_email}</p>
                                    <p className="text-sm text-slate-200">{admin.admin_phone}</p>
                                    <div className="absolute top-2 right-2 cursor-pointer" onClick={() => setAdminList(adminList.filter((_, i) => i !== index))}>
                                        <Tooltip title="Remove Entry ?"><Trash2 className="hover:text-red-900" size={20} /></Tooltip>
                                    </div>
                                </div>
                            </div>)}
                        </div>
                        <Dialog open={openAddAdmin} onOpenChange={setOpenAddAdmin}>
                            <DialogTrigger>
                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.05 }} className="mx-1 flex items-center justify-center w-[200px] bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-2 rounded-lg gap-2 cursor-pointer">
                                    <UserPlus size={18} />
                                    <h1 className="text-sm">Add Admin</h1>
                                </motion.div>
                            </DialogTrigger>
                            <DialogContent className="lg:max-w-[450px]">
                                <DialogHeader>
                                    <DialogTitle>Add Business Admin</DialogTitle>
                                    <DialogDescription>Business Admins could manage the business as admins</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <Input value={admin_name} onChange={(e) => setAdminName(e.target.value)} placeholder="* Admin Name" />
                                    <Input value={admin_email} onChange={(e) => setAdminEmail(e.target.value)} placeholder="* Admin Email" />
                                    <Input value={admin_phone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="* Admin Phone" />
                                    <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-3 rounded-lg text-center text-sm font-semibold cursor-pointer"
                                        onClick={handleAddAdmins}
                                    >
                                        Add Business Admin
                                    </motion.div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* BUSINESS DOCUMENTS */}
                    <div>
                        <h1 className="text-sm font-semibold mb-1 mx-1">Business Documents</h1>
                        <div className="w-full flex flex-wrap">
                            {docList.length > 0 && docList.map((doc, index) => <div key={index} className="w-3/12 p-1">
                                <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-3 rounded-lg relative">
                                    <h1 className="text-lg font-semibold text-slate-200">{doc?.doc_name}</h1>
                                    <p className="text-sm text-slate-200">Expire: <span className="text-slate-400">{formatDateTiny(new Date(doc?.doc_expire_date).toDateString())}</span></p>
                                    <div className="absolute top-2 right-2 cursor-pointer" onClick={() => handleRemoveDoc(index)}>
                                        <Tooltip title="Remove Doc ?"><Trash2 className="hover:text-red-900" size={20} /></Tooltip>
                                    </div>
                                </motion.div>
                            </div>)}
                        </div>
                        <Dialog open={openAddDoc} onOpenChange={setOpenAddDoc}>
                            <DialogTrigger>
                                <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.05 }} className="mx-1 flex items-center justify-center w-[200px] bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-2 rounded-lg gap-2 cursor-pointer">
                                    <FilePlus2 size={18} />
                                    <h1 className="text-sm">Add Document</h1>
                                </motion.div>
                            </DialogTrigger>
                            <DialogContent className="lg:max-w-[450px]">
                                <DialogHeader>
                                    <DialogTitle>Add Business Document</DialogTitle>
                                    <DialogDescription>Business Documents helps to validate the genunity of a business</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <Input value={doc_name} onChange={(e) => setDocName(e.target.value)} placeholder="* Document Name" required />
                                    <Tooltip title="Expiry Date">
                                        <Input value={doc_expire_date} onChange={(e) => setDocExpireDate(e.target.value)} type="date" placeholder="* Document Expire Date" required />
                                    </Tooltip>
                                    <Input onChange={(e) => setDocFile(e.target.files?.[0] || null)} type="file" required />
                                    {doc_file && <p>Selected file: {doc_file.name}</p>}
                                    <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-3 rounded-lg text-center text-sm font-semibold cursor-pointer"
                                        onClick={handleAddDocs}
                                    >
                                        {"Upload Document"}
                                    </motion.div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Save Button */}
                    <Popconfirm title="Are you sure you want to save this business?" okText="Save" cancelText="Cancel" onConfirm={handleAddToBusiness}>
                        <motion.div whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.05 }}
                            className="bg-gradient-to-br border border-slate-700 from-cyan-900/50 mt-10 to-cyan-950/50 p-2 w-[200px] lg:ml-auto lg:mr-10 rounded-lg text-center text-sm font-semibold cursor-pointer flex items-center justify-center"
                        >
                            {loading || addingBusinessDetails ? <LoaderSpin size={25} /> : "Save Details"}
                        </motion.div>
                    </Popconfirm>
                </div>
            </div>

            

            {/* Custom Plan Dialog */}
            <Dialog open={openAddCustomPlan} onOpenChange={setOpenAddCustomPlan}>
                <DialogContent className="lg:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Custom Plan</DialogTitle>
                        <DialogDescription>Add a custom plan for this business</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input type="text" value={customPlan?.plan_name} onChange={(e) => setCustomPlan({ ...customPlan, plan_name: e.target.value })} placeholder="* Plan Name" required />
                        <Input type="number" value={customPlan?.staff_count} onChange={(e) => setCustomPlan({ ...customPlan, staff_count: e.target.value })} placeholder="* Staff Count" required />
                        <Input type="number" value={customPlan?.regions_count} onChange={(e) => setCustomPlan({ ...customPlan, regions_count: e.target.value })} placeholder="* Regions Count" required />
                        <Input type="number" value={customPlan?.deps_count} onChange={(e) => setCustomPlan({ ...customPlan, deps_count: e.target.value })} placeholder="* Departments Count" required />
                    </div>
                    <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-br border border-slate-700 from-slate-900 to-slate-800 p-3 rounded-lg text-center text-sm font-semibold cursor-pointer"
                        onClick={handleAddCustomPlan}
                    >
                        Add Custom Plan
                    </motion.div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AdminBusinessDetails
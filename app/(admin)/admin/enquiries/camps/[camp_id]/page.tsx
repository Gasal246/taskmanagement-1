"use client";

import { ArrowLeft, Home, Building2, Pencil, Trash } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { useAddNewCampContact, useGetEqCampsById, useRemoveEqCamp, useUpdateEqCampContact } from "@/query/enquirymanager/queries";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EQ_CONTACT_AUTHORITY } from "@/lib/constants";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";



export default function CampDetailsPage() {
    const router = useRouter();
    const params = useParams<{ camp_id: string }>()
    const { data: camps, isLoading, refetch } = useGetEqCampsById(params.camp_id);
    const { mutateAsync: updateContact, isPending } = useUpdateEqCampContact();
    const {mutateAsync: AddContact, isPending: isAdding } = useAddNewCampContact();
    const { mutateAsync: RemoveCamp, isPending: isRemoving } = useRemoveEqCamp();

    const [modalOpen, setModalOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<any>(null);

    const [newContact, setNewContact] = useState<any>(null);

    const contactsSchema = z.object({
        contact_name: z.string().min(1, "Name required"),
        contact_phone: z.string().min(5, "Valid Phone requiried"),
        contact_email: z.string().min(1, "Valid E-Mail required"),
        contact_authorization: z.string().min(1, "Contact Authorization required"),
        contact_designation: z.string().min(1, "Contact Designation required"),
        is_decision_maker: z.enum(["Yes", "No"])
    });

    const form = useForm({
        resolver: zodResolver(contactsSchema)
    });

    function openEditModal(contact: any) {
        setSelectedContact(contact);
        setModalOpen(true);
    }

    function handleContactChange(field: string, value: string) {
        setSelectedContact((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    }

    function handleContactAdd(field: string, value: string) {
        setNewContact((prev: any) => ({
            ...prev,
            [field]: value,
        }))
    }

    async function handleSave() {
        console.log("Edited Contact:", selectedContact);
        const res = await updateContact(selectedContact);
        if (res.status == 200) {
            toast.success(res?.message || "Contact Updated!");
            refetch();
        } else {
            toast.error(res?.message);
        }
        setModalOpen(false);
    }

    const AddNewContact = async (data: any) => {
        const payload = {
            ...data,
            camp_id: params.camp_id
        }

        const res = await AddContact(payload);
        if(res?.status == 201){
            toast.success(res?.message);
            refetch();
        } else {
            toast.error(res?.message || "Failed to add contact");
        }
        setAddModalOpen(false);
    }

    const DeleteCamp = async() => {
        const res = await RemoveCamp(params.camp_id);
        if(res?.status == 200){
            toast.success(res?.message || "Camp removed");
            return router.replace("/admin/enquiries/camps")
        }
        toast.error(res?.message || "Failed to remove camp")
    }


    useEffect(() => {
        console.log("camps: ", camps);
    }, [camps]);

    return (
        <div className="p-6 text-slate-200">

            {/* Back Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.replace("/admin/enquiries/camps")}
                className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
            >
                <ArrowLeft size={16} /> Back
            </motion.button>

            {/* Header */}
            <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-5 rounded-xl mb-6 border border-slate-700 flex items-start justify-between">

                {/* LEFT */}
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Home size={20} /> {camps?.camp?.camp_name}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {camps?.camp?.country_id?.country_name} • {camps?.camp?.region_id?.region_name} •{" "}
                        {camps?.camp?.province_id?.province_name} • {camps?.camp?.city_id?.city_name} •{" "}
                        {camps?.camp?.area_id?.area_name}
                    </p>
                </div>

                {/* RIGHT — EDIT BUTTON */}
                <div className="space-y-2 flex flex-col">

                <Button
                    className="flex items-center gap-1"
                    onClick={() =>
                        router.push(`/admin/enquiries/camps/${params.camp_id}/edit_camp`)
                    }
                >
                    <Pencil size={16} /> Edit Camp
                </Button>

                <Button
                variant="outline"
                    className="flex items-center gap-1 bg-red-500"
                    onClick={() =>
                        setDeleteModalOpen(true)
                    }
                >
                    <Trash size={16} /> Delete Camp
                </Button>
                </div>
            </div>

            {/* CAMP DETAILS */}
            <DetailsCard title="Camp Information">
                <Detail label="Camp Type" value={camps?.camp?.camp_type} />
                <Detail label="Country" value={camps?.camp?.country_id?.country_name} />
                <Detail label="Region" value={camps?.camp?.region_id?.region_name} />
                <Detail label="Province" value={camps?.camp?.province_id?.province_name} />
                <Detail label="City" value={camps?.camp?.city_id?.city_name} />
                <Detail label="Area" value={camps?.camp?.area_id?.area_name} />

                <Detail label="Latitude" value={camps?.camp?.latitude} />
                <Detail label="Longitude" value={camps?.camp?.longitude} />
                <Detail label="Visited Status" value={camps?.camp?.visited_status || "Just Added"} />

                <Detail label="Capacity" value={camps?.camp?.camp_capacity} />
                <Detail label="Current Occupancy" value={camps?.camp?.camp_occupancy} />

                <Detail
                    label="Active Status"
                    value={camps?.camp?.is_active ? "Active" : "Inactive"}
                    color={camps?.camp?.is_active ? "text-green-400" : "text-red-400"}
                />

                <Detail
                    label="Enquiry Added"
                    value={camps?.camp?.is_eq_added ? "Yes" : "No"}
                    color={camps?.camp?.is_eq_added ? "text-green-400" : "text-red-400"}
                />

                <Detail label="Client Company" value={camps?.camp?.client_company_id?.client_company_name ?? "N/A"} />
                <Detail label="Real Estate" value={camps?.camp?.realestate_id?.company_name ?? "N/A"} />
                <Detail label="Landlord" value={camps?.camp?.landlord_id?.landlord_name ?? "N/A"} />

                <Detail
                    label="Created At"
                    value={new Date(camps?.camp?.createdAt).toLocaleDateString()}
                />
                <Detail
                    label="Updated At"
                    value={new Date(camps?.camp?.updatedAt).toLocaleDateString()}
                />
            </DetailsCard>

            {/* HEAD OFFICE DETAILS */}
            {camps?.camp?.headoffice_id && (
                <DetailsCard title="Head Office Details" icon={<Building2 size={16} />}>
                    <Detail label="Phone" value={camps?.camp?.headoffice_id?.phone} />
                   <Detail
  label="Geo Location"
  value={
    <a
      href={camps?.camp?.headoffice_id?.geo_location}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-400 underline"
    >
      View Location
    </a>
  }
/>
                    <Detail label="Address" value={camps?.camp?.headoffice_id?.address} />
                    <Detail label="Other Details" value={camps?.camp?.headoffice_id?.other_details} />

                    <Detail
                        label="Created At"
                        value={new Date(camps?.camp?.headoffice_id?.createdAt).toLocaleDateString()}
                    />
                    <Detail
                        label="Updated At"
                        value={new Date(camps?.camp?.headoffice_id?.updatedAt).toLocaleDateString()}
                    />
                </DetailsCard>
            )}

            {/* CONTACTS */}
            {camps?.contacts?.length > 0 && (
                camps?.contacts?.map((contact: any, index: number) => (
                    <DetailsCard key={contact?._id} title={`Contact ${index + 1}`} icon={<Building2 size={16} />}>
                        <Detail label="Name" value={contact?.contact_name} />
                        <Detail label="Phone" value={contact?.contact_phone} />
                        <Detail label="Email" value={contact?.contact_email} />
                        <Detail label="Authorization" value={contact?.contact_authorization} />
                        <Detail label="Designation" value={contact?.contact_designation} />
                        <Detail label="Is Decision Maker" value={contact?.is_decision_maker ? "Yes" : "No"} />

                        <Button
                            variant="outline"
                            className="flex items-center gap-1 mt-3"
                            onClick={() => openEditModal(contact)}
                        >
                            <Pencil size={16} /> Edit Contact
                        </Button>
                    </DetailsCard>
                ))
            )}

            <Button
                onClick={() => setAddModalOpen(true)}
            >Add Contact</Button>

            {/* EDIT CONTACT MODAL */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
                    <DialogHeader>
                        <DialogTitle>Edit Contact</DialogTitle>
                    </DialogHeader>

                    {selectedContact && (
                        <div className="space-y-4 mt-3">

                            <div>
                                <Label>Name</Label>
                                <Input
                                    value={selectedContact.contact_name}
                                    onChange={(e) => handleContactChange("contact_name", e.target.value)}
                                />
                            </div>

                            <div>
                                <Label>Phone</Label>
                                <Input
                                    value={selectedContact.contact_phone}
                                    onChange={(e) => handleContactChange("contact_phone", e.target.value)}
                                />
                            </div>

                            <div>
                                <Label>Email</Label>
                                <Input
                                    value={selectedContact.contact_email}
                                    onChange={(e) => handleContactChange("contact_email", e.target.value)}
                                />
                            </div>

                            <div>
                                <Label>Designation</Label>
                                <Input
                                    value={selectedContact.contact_designation}
                                    onChange={(e) => handleContactChange("contact_designation", e.target.value)}
                                />
                            </div>

                            <div>
                                <Label>Authorization</Label>
                                <Select
                                    value={selectedContact.contact_authorization}
                                    onValueChange={(val: any) => handleContactChange("contact_authorization", val)}
                                >
                                    <SelectTrigger className="text-slate-200">
                                        <SelectValue placeholder="Authority Level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EQ_CONTACT_AUTHORITY.map((c) => (
                                            <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Is Decision Maker</Label>
                                <Select
                                    value={String(selectedContact.is_decision_maker)}
                                    onValueChange={(val: any) => handleContactChange("is_decision_maker", val)}
                                >
                                    <SelectTrigger className="text-slate-200">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true" >Yes</SelectItem>
                                        <SelectItem value="false" >No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
                     <DialogHeader>
                        <DialogTitle>Delete Camp</DialogTitle>
                    </DialogHeader>
                    
                    <p className="text-red-400 font-semibold">Proceeding with this action will remove enquiry associated with this camp.</p>

                    <DialogFooter className="mt-4">
                                <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                disabled={isRemoving}
                                onClick={DeleteCamp}>{isRemoving ? "Deleting" : "Delete"}</Button>
                            </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Add Contact Modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="bg-slate-900 border border-slate-700 text-slate-200">
                    <DialogHeader>
                        <DialogTitle>Add Contact</DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(AddNewContact)}
                            className="space-y-4 mt-3"
                        >
                            {/* Name */}
                            <FormField
                                control={form.control}
                                name="contact_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Name</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Phone */}
                            <FormField
                                control={form.control}
                                name="contact_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Phone</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email */}
                            <FormField
                                control={form.control}
                                name="contact_email"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Email</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Designation */}
                            <FormField
                                control={form.control}
                                name="contact_designation"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Designation</Label>
                                        <Input {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Authorization */}
                            <FormField
                                control={form.control}
                                name="contact_authorization"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Authorization</Label>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Authority Level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EQ_CONTACT_AUTHORITY.map((c) => (
                                                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Decision Maker */}
                            <FormField
                                control={form.control}
                                name="is_decision_maker"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Is Decision Maker</Label>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="mt-4">
                                <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                disabled={isAdding}
                                type="submit">{isAdding ? "Saving" : "Save"}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ----------------------------------------------
    REUSABLE DETAIL COMPONENTS
---------------------------------------------- */

function DetailsCard({ title, children, icon }: any) {
    return (
        <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-5 rounded-lg border border-slate-800 mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                {icon} {title}
            </h3>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function Detail({
    label,
    value,
    color,
}: {
    label: string;
    value: ReactNode;
    color?: string;
}) {
    return (
        <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400 text-sm">{label}</span>
            <span className={`text-sm font-medium ${color ?? "text-slate-200"}`}>
                {value ?? "N/A"}
            </span>
        </div>
    );
}

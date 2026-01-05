"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { EQ_CONTACT_AUTHORITY } from "@/lib/constants";
import { useAddNewContactAgent, useGetEnquiryContacts, useRemoveEqContact, useUpdateEqCampContact } from "@/query/enquirymanager/queries";

const emptyContact = {
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  contact_designation: "",
  contact_authorization: "",
  is_decision_maker: "No",
};

export default function CampContactsPage() {
  const router = useRouter();
  const params = useParams<{ enquiry_id: string }>();

  const { data: contacts, isLoading, refetch } = useGetEnquiryContacts(params.enquiry_id);
  const { mutateAsync: AddContact, isPending: isAdding } = useAddNewContactAgent();
  const { mutateAsync: UpdateContact, isPending: isUpdating } = useUpdateEqCampContact();
  const { mutateAsync: RemoveContact, isPending: isDeleting } = useRemoveEqContact();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [addContact, setAddContact] = useState({ ...emptyContact });
  const [editContact, setEditContact] = useState<any>({ ...emptyContact, _id: "" });
  const [selectedContactId, setSelectedContactId] = useState("");

  useEffect(() => {
    if (!addOpen) return;
    setAddContact({ ...emptyContact });
  }, [addOpen]);

  const handleAddChange = (field: string, value: string) => {
    setAddContact((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditChange = (field: string, value: string) => {
    setEditContact((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOpenEdit = (contact: any) => {
    setEditContact({
      _id: contact._id,
      contact_name: contact.contact_name || "",
      contact_phone: contact.contact_phone || "",
      contact_email: contact.contact_email || "",
      contact_designation: contact.contact_designation || "",
      contact_authorization: contact.contact_authorization || "",
      is_decision_maker: contact.is_decision_maker ? "Yes" : "No",
    });
    setEditOpen(true);
  };

  const handleAddContact = async () => {
    const payload = {
      ...addContact,
      enquiry_id: params.enquiry_id,
      is_decision_maker: addContact.is_decision_maker || "No",
    };

    const res = await AddContact(payload);
    if (res?.status === 201) {
      toast.success(res?.message || "Contact added");
      setAddOpen(false);
      refetch();
      return;
    }
    toast.error(res?.message || "Failed to add contact");
  };

  const handleUpdateContact = async () => {
    const payload = {
      ...editContact,
      is_decision_maker: editContact.is_decision_maker === "Yes" ? "true" : "false",
    };
    const res = await UpdateContact(payload);
    if (res?.status === 200) {
      toast.success(res?.message || "Contact updated");
      setEditOpen(false);
      refetch();
      return;
    }
    toast.error(res?.message || "Failed to update contact");
  };

  const handleDeleteContact = async () => {
    const res = await RemoveContact(selectedContactId);
    if (res?.status === 200) {
      toast.success(res?.message || "Contact deleted");
      setDeleteOpen(false);
      refetch();
      return;
    }
    toast.error(res?.message || "Failed to delete contact");
  };

  return (
    <div className="p-6 text-slate-200">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </motion.button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <User size={20} /> Camp Contacts
        </h2>
        <Button onClick={() => setAddOpen(true)} className="bg-cyan-700 hover:bg-cyan-600">
          <Plus size={16} /> Add Contact
        </Button>
      </div>

      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading contacts...</p>
        ) : contacts?.contacts?.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">
            No contacts available.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-slate-300 border-b border-slate-700">
              <tr className="text-left">
                <th className="py-2">Name</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Email</th>
                <th className="py-2">Designation</th>
                <th className="py-2">Authorization</th>
                <th className="py-2">Decision Maker</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {contacts?.contacts?.map((c: any) => (
                <tr
                  key={c._id}
                  className="border-b border-slate-800 hover:bg-slate-800/40 transition"
                >
                  <td className="py-2">{c.contact_name}</td>
                  <td className="py-2">{c.contact_phone}</td>
                  <td className="py-2">{c.contact_email}</td>
                  <td className="py-2">{c.contact_designation}</td>
                  <td className="py-2">{c.contact_authorization}</td>
                  <td className="py-2">{c.is_decision_maker ? "Yes" : "No"}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400"
                        onClick={() => {
                          setSelectedContactId(c._id);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a new contact for this enquiry.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-300">Name</Label>
              <Input value={addContact.contact_name} onChange={(e) => handleAddChange("contact_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Phone</Label>
              <Input value={addContact.contact_phone} onChange={(e) => handleAddChange("contact_phone", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Email</Label>
              <Input value={addContact.contact_email} onChange={(e) => handleAddChange("contact_email", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Designation</Label>
              <Input value={addContact.contact_designation} onChange={(e) => handleAddChange("contact_designation", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Authority Level</Label>
              <Select value={addContact.contact_authorization} onValueChange={(val) => handleAddChange("contact_authorization", val)}>
                <SelectTrigger className="text-slate-200">
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  {EQ_CONTACT_AUTHORITY.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Is Decision Maker?</Label>
              <Select value={addContact.is_decision_maker} onValueChange={(val) => handleAddChange("is_decision_maker", val)}>
                <SelectTrigger className="text-slate-200">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContact} disabled={isAdding}>
              {isAdding ? "Saving..." : "Save Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-300">Name</Label>
              <Input value={editContact.contact_name} onChange={(e) => handleEditChange("contact_name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Phone</Label>
              <Input value={editContact.contact_phone} onChange={(e) => handleEditChange("contact_phone", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Email</Label>
              <Input value={editContact.contact_email} onChange={(e) => handleEditChange("contact_email", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Designation</Label>
              <Input value={editContact.contact_designation} onChange={(e) => handleEditChange("contact_designation", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-300">Authority Level</Label>
              <Select value={editContact.contact_authorization} onValueChange={(val) => handleEditChange("contact_authorization", val)}>
                <SelectTrigger className="text-slate-200">
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  {EQ_CONTACT_AUTHORITY.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-300">Is Decision Maker?</Label>
              <Select value={editContact.is_decision_maker} onValueChange={(val) => handleEditChange("is_decision_maker", val)}>
                <SelectTrigger className="text-slate-200">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateContact} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this contact?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteContact}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

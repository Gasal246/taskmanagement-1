"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, User, Clock, BadgeCheck, Pencil, Trash2, UserCircle2 } from "lucide-react";
import { Avatar } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useGetEnquiryById, useRemoveEnquiry } from "@/query/enquirymanager/queries";
import { formatDateTiny } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";


export default function SingleEnquiryPage() {
  const router = useRouter();
  const params = useParams<{ enquiry_id: string }>();
  const { data: enquiry, isLoading } = useGetEnquiryById(params.enquiry_id);
  const { mutateAsync: RemoveEnquiry, isPending: isDeleting } = useRemoveEnquiry();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const openMap = () => {
    const lat = enquiry?.enquiry?.camp_id?.latitude;
    const lng = enquiry?.enquiry?.camp_id?.longitude;
    if (!lat || !lng) {
      toast.error("Location not available.");
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const handleDeleteEnquiry = async () => {
    const res = await RemoveEnquiry(params.enquiry_id);
    if (res?.status === 200) {
      toast.success(res?.message || "Enquiry deleted");
      router.replace("/admin/enquiries");
      return;
    }
    toast.error(res?.message || "Failed to delete enquiry");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className='p-4 pb-10'>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => router.replace("/admin/enquiries")}>Enquiries</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Enquiry</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="p-4 pb-10 text-slate-100">
        {/* HEADER */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <UserCircle2 size={20} /> Enquiry Details
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Enquiry ID: {enquiry?.enquiry?.enquiry_uuid}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">Manage</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}/edit`)}
                  >
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {/* BUTTONS ON RIGHT */}
          <div className="flex flex-wrap items-center gap-3">
            {!enquiry?.enquiry?.area_id?.is_active && (<Button
              className="flex items-center gap-1"
              onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}/area/${enquiry?.enquiry?.area_id?._id}`)}
            >
              Activate Area
            </Button>)}

            {!enquiry?.enquiry?.camp_id?.is_active && (<Button
              className="flex items-center gap-1"
              disabled={!enquiry?.enquiry?.area_id?.is_active}
              onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}/camp`)}
            >
              Activate Camp
            </Button>)}

            {enquiry?.enquiry?.is_edit_req && (
              <Button
                className="flex items-center gap-1"
                onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}/edited`)}
              >
                View Edited
              </Button>
            )}
          </div>
        </div>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete this enquiry?</DialogTitle>
              <DialogDescription>
                This will remove the enquiry and its related records. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteEnquiry}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CARD */}
        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-5">
          {/* BASIC INFO */}

          {/* LOCATION DETAILS */}
          <div className="mt-5 space-y-2">
            <h2 className="font-semibold text-lg mb-2">Location Details</h2>
            <p className="text-sm">Country: {enquiry?.enquiry?.country_id?.country_name}</p>
            <p className="text-sm">Region: {enquiry?.enquiry?.region_id?.region_name}</p>
            <p className="text-sm">Province: {enquiry?.enquiry?.province_id?.province_name}</p>
            <p className="text-sm">City: {enquiry?.enquiry?.city_id?.city_name}</p>
            <p className="text-sm">Area: {enquiry?.enquiry?.area_id?.area_name}</p>
            <p className="text-sm">Camp: {enquiry?.enquiry?.camp_id?.camp_name}</p>
            <p className="text-sm">Camp Capacity: {enquiry?.enquiry?.camp_id?.camp_capacity}</p>
            <p className="text-sm">Camp Occupancy: {enquiry?.enquiry?.camp_id?.camp_occupancy}</p>
            <p className="text-sm">Latitude: {enquiry?.enquiry?.camp_id?.latitude}</p>
            <p className="text-sm">Longitude: {enquiry?.enquiry?.camp_id?.longitude}</p>
            <Button onClick={openMap}>Go to Location</Button>
          </div>

          {enquiry?.head_office &&
            <div className="mt-5 space-y-2">
              <h2 className="font-semibold text-lg mb-2">Head Office Details</h2>

              <p className="text-sm">Phone: {enquiry?.head_office?.phone}</p>
              <p className="text-sm">
                Geo Location:{" "}
                {enquiry?.head_office?.geo_location ? (
                  <a
                    href={enquiry.head_office.geo_location}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View Location
                  </a>
                ) : (
                  "-"
                )}
              </p>
              <p className="text-sm">Address: {enquiry?.head_office?.address}</p>
              <p className="text-sm">Other details: {enquiry?.head_office?.other_details}</p>
            </div>
          }

          <div className="space-y-3">
            <h2 className="font-semibold text-lg mb-2">Contact Information</h2>

            <div className="flex items-center gap-2 text-sm">
              <User size={16} />
              <span>{enquiry?.contacts[0]?.contact_name}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Mail size={16} />
              <span>{enquiry?.contacts[0]?.contact_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={16} />
              <span>{enquiry?.contacts[0]?.contact_phone}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <BadgeCheck size={16} />
              <span className="text-yellow-400">Is Decision Maker: {enquiry?.contacts[0]?.is_decision_maker ? "Yes" : "No"}</span>
            </div>
            <Button
              onClick={() => router.push(`/admin/enquiries/${params.enquiry_id}/contacts`)}
            >Show More</Button>
          </div>

          {/* CREATED BY */}
          <div className="mt-5">
            <h2 className="font-semibold text-lg mb-2">Created By</h2>
            <div className="flex items-center gap-3 border border-slate-800 p-3 rounded-xl bg-slate-900/40">
              <Avatar size={50} src="https://api.dicebear.com/7.x/personas/svg" />
              <div>
                <h3 className="font-semibold text-sm">{enquiry?.enquiry?.createdBy?.name}</h3>
              </div>
            </div>
          </div>

          {enquiry?.assigned && (
            <div className="mt-5">
              <h2 className="font-semibold text-lg mb-2">Assigned To</h2>
              <div className="flex items-center gap-3 border border-slate-800 p-3 rounded-xl bg-slate-900/40">
                <Avatar size={50} src="https://api.dicebear.com/7.x/personas/svg" />
                <div>
                  <h3 className="font-semibold text-sm">{enquiry?.assigned?.assigned_to?.name}</h3>
                </div>
              </div>
            </div>
          )}



          {/* MESSAGE */}
          <div className="mt-5">
            <h2 className="font-semibold text-lg mb-2">WiFi Information</h2>
            <div className="text-sm text-slate-300 border border-slate-800 p-3 rounded-lg bg-slate-900/40 font-semibold space-y-2">
              <p className="text-sm">WiFi Status: {enquiry?.enquiry?.wifi_available ? "Available" : "No WiFi"}</p>
              {enquiry?.enquiry?.wifi_available ? (
                <>
                  <p className="text-sm">WiFi Type: {enquiry?.enquiry?.wifi_type}</p>
                  {enquiry?.enquiry?.wifi_type == "Existing Contractor" ? (
                    <>
                      <p className="text-sm">WiFi Contractor: {enquiry?.external_provider?.contractor_name || "N/A"}</p>
                      <p className="text-sm">Contract start date: {formatDateTiny(enquiry?.external_provider?.contract_start_date) || "N/A"}</p>
                      <p className="text-sm">Contract end date: {formatDateTiny(enquiry?.external_provider?.contract_end_date) || "N/A"}</p>
                      <p className="text-sm">WiFi Plan: {enquiry?.external_provider?.contract_package || "N/A"}</p>
                      <p className="text-sm">WiFi Speed: {enquiry?.external_provider?.contract_speed || "N/A"} MBPS</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">WiFi Plan: {enquiry?.personal_provider?.personal_plan || "N/A"}</p>
                      <p className="text-sm">Start date: {formatDateTiny(enquiry?.personal_provider?.personal_start_date) || "N/A"}</p>
                      <p className="text-sm">End date: {formatDateTiny(enquiry?.personal_provider?.personal_end_date) || "N/A"}</p>
                      <p className="text-sm">Monthly Price: {enquiry?.personal_provider?.personal_monthly_price?.$numberDecimal ?? enquiry?.personal_provider?.personal_monthly_price}</p>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm">WiFi Expected Cost: {enquiry?.enquiry?.expected_wifi_cost?.$numberDecimal ?? enquiry?.enquiry?.expected_wifi_cost}</p>
              )}
            </div>
          </div>

          {/* ENQUIRY DETAILS */}
          <div className="mt-5">
            <h2 className="font-semibold text-lg mb-2">Enquiry Information</h2>
            <div className="text-sm text-slate-300 border border-slate-800 p-3 rounded-lg bg-slate-900/40 font-semibold space-y-2">
              <p className="text-sm">Enquiry Priority: {enquiry?.enquiry?.priority}/10</p>
              <p className="text-sm">Enquiry Status: {enquiry?.enquiry?.status}</p>
              <p className="text-sm">Competition Status: {enquiry?.enquiry?.competition_status ? "Yes" : "No"}</p>
              <p className="text-sm">Competition Notes: {enquiry?.enquiry?.competition_notes}</p>
              <p className="text-sm">Rent Terms: {enquiry?.enquiry?.rent_terms}</p>
              <p className="text-sm">Lease Expiry: {formatDateTiny(enquiry?.enquiry?.lease_expiry_due)}</p>
              <p className="text-sm">Next Action: {enquiry?.enquiry?.next_action}</p>
              <p className="text-sm">Next Action Due Date: {formatDateTiny(enquiry?.enquiry?.next_action_due)}</p>
            </div>
          </div>


          {/* DATES */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} />
              <span>Created: {formatDateTiny(enquiry?.enquiry?.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} />
              <span>Last Updated: {formatDateTiny(enquiry?.enquiry?.updatedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">

            {/* Forward Enquiry Button */}
            <Button
              onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}/forward-enquiry`)}
              className="flex items-center gap-1"
              disabled={!enquiry?.enquiry?.is_active}
            >
              Forward Enquiry
            </Button>

            {/* View History Button (smaller) */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="text-xs flex items-center gap-1 cursor-pointer 
                bg-gradient-to-br from-slate-950/60 to-slate-900/60 
                p-2.5 px-4 rounded-md border border-slate-700 
                hover:border-cyan-600 transition"
              onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}/history`)}
            >
              View History
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, User, Pencil, Trash2, UserCircle2, MapPin, Wifi, Sparkles } from "lucide-react";
import { Avatar } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useGetEnquiryById, useGetEnquiryComments, useGetEnquiryContacts, useGetEqCampsById, useRemoveEnquiry } from "@/query/enquirymanager/queries";
import { formatDateTiny } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";


export default function SingleEnquiryPage() {
  const router = useRouter();
  const params = useParams<{ enquiry_id: string }>();
  const { data: enquiry, isLoading } = useGetEnquiryById(params.enquiry_id);
  const { data: contactsData } = useGetEnquiryContacts(params.enquiry_id);
  const { data: commentsData, isLoading: isCommentsLoading } = useGetEnquiryComments(params.enquiry_id);
  const baseCampId = enquiry?.enquiry?.camp_id?._id ?? enquiry?.enquiry?.camp_id;
  const { data: campData, isLoading: isCampLoading } = useGetEqCampsById(baseCampId || "");
  const { mutateAsync: RemoveEnquiry, isPending: isDeleting } = useRemoveEnquiry();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const camp = campData?.camp || enquiry?.enquiry?.camp_id;
  const contacts = contactsData?.contacts ?? enquiry?.contacts ?? [];
  const sortedComments = useMemo(() => {
    const source = commentsData?.comments;
    const list = Array.isArray(source) ? [...source] : [];
    return list.sort((a: any, b: any) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [commentsData?.comments]);
  const recentComments = sortedComments.slice(0, 3);
  const hasMoreComments = sortedComments.length > 3;
  const latitude = camp?.latitude || enquiry?.enquiry?.latitude;
  const longitude = camp?.longitude || enquiry?.enquiry?.longitude;

  const openMap = () => {
    if (!latitude || !longitude) {
      toast.error("Location not available.");
      return;
    }
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, "_blank");
  };

  const renderValue = (value: any, fallback = "Not specified") => {
    if (value === null || value === undefined || value === "") return fallback;
    return value;
  };

  const renderDate = (value?: string | Date | null, fallback = "Not set") => {
    if (!value) return fallback;
    return formatDateTiny(value);
  };

  const renderDecimal = (value: any, fallback = "Not specified") => {
    const resolved = value?.$numberDecimal ?? value;
    return renderValue(resolved, fallback);
  };

  const renderBool = (value: any) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "Not specified";
  };

  const renderAssignedUsers = (value: any, fallback = "Unassigned") => {
    if (!value) return fallback;
    const list = Array.isArray(value) ? value : [value];
    const names = list
      .map((item) => item?.name || item?.email || item)
      .filter(Boolean)
      .map((entry) => String(entry));
    return names.length ? names.join(", ") : fallback;
  };

  const renderUserList = (users: any[]) => {
    if (!Array.isArray(users) || users.length === 0) return "Not specified";
    const names = users
      .map((user) => user?.name || user?.email || user)
      .filter(Boolean)
      .map((entry) => String(entry));
    return names.length > 0 ? names.join(", ") : "Not specified";
  };

  const formatCommentTime = (value: any) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleString();
  };

  const renderCommentCard = (comment: any) => {
    const commentId = String(comment?._id || "");
    const createdAt = formatCommentTime(comment?.createdAt);
    const updatedAt = formatCommentTime(comment?.updatedAt);
    const wasEdited = Boolean(comment?.createdAt && comment?.updatedAt && new Date(comment.updatedAt).getTime() !== new Date(comment.createdAt).getTime());

    return (
      <div key={commentId} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar size={36} src={`https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(comment?.user_id?.email || comment?.user_id?.name || commentId)}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{comment?.user_id?.name || "Unknown User"}</p>
            <p className="text-xs text-slate-400 truncate">{comment?.user_id?.email || "No email"}</p>
          </div>
        </div>
        <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment?.comment || "-"}</p>
        <div className="text-[11px] text-slate-500 flex flex-wrap gap-3">
          <span>Created: {createdAt}</span>
          {wasEdited && <span>Updated: {updatedAt}</span>}
        </div>
      </div>
    );
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-xs text-slate-200 text-right">{value}</span>
    </div>
  );

  const handleDeleteEnquiry = async () => {
    const res = await RemoveEnquiry(params.enquiry_id);
    if (res?.status === 200) {
      toast.success(res?.message || "Enquiry deleted");
      router.replace("/admin/enquiries");
      return;
    }
    toast.error(res?.message || "Failed to delete enquiry");
  };

  if (isLoading || (baseCampId && isCampLoading)) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-cyan-400" />
      </div>
    );
  }

  const wifiAvailability = enquiry?.enquiry?.wifi_available;
  const wifiStatusLabel = wifiAvailability === true ? "Available" : wifiAvailability === false ? "No WiFi" : "Not Specified";
  const priorityLabel = enquiry?.enquiry?.priority ? `${enquiry?.enquiry?.priority}/10` : "Not set";
  const statusLabel = enquiry?.enquiry?.status || "Lead Received";
  const activeLabel = enquiry?.enquiry?.is_active ? "Active" : "Inactive";
  const conversionLabel = enquiry?.enquiry?.is_converted ? "Yes" : "Not Yet";

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
        <div className="mb-4 space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <UserCircle2 size={20} /> Enquiry Details
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Enquiry ID: {enquiry?.enquiry?.enquiry_uuid}
              </p>
              {/* <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Sparkles size={12} /> Everything is captured here for a smooth next step.
              </p> */}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2 py-1 text-slate-300">
                  Status: {statusLabel}
                </span>
                <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2 py-1 text-slate-300">
                  Priority: {priorityLabel}
                </span>
                {/* <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2 py-1 text-slate-300">
                  Is Active: {activeLabel}
                </span> */}
                <span className="rounded-full border border-slate-800 bg-slate-900/50 px-2 py-1 text-slate-300">
                  Project: {conversionLabel}
                </span>
              </div>
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
        <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-sm font-semibold text-slate-300">At a glance</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Camp" value={renderValue(camp?.camp_name || enquiry?.enquiry?.camp_id?.camp_name)} />
              <InfoRow label="Area" value={renderValue(enquiry?.enquiry?.area_id?.area_name)} />
              <InfoRow label="Region" value={renderValue(enquiry?.enquiry?.region_id?.region_name)} />
              <InfoRow label="Wi-Fi" value={wifiStatusLabel} />
              <InfoRow label="Next Action Due" value={renderDate(enquiry?.enquiry?.next_action_due)} />
              <InfoRow label="Assigned To" value={renderAssignedUsers(enquiry?.assigned?.assigned_to)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg">Location & Camp</h2>
              <Button variant="outline" size="sm" className="gap-2" onClick={openMap}>
                <MapPin size={14} /> Open Map
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <InfoRow label="Country" value={renderValue(enquiry?.enquiry?.country_id?.country_name)} />
              <InfoRow label="Region" value={renderValue(enquiry?.enquiry?.region_id?.region_name)} />
              <InfoRow label="Province" value={renderValue(enquiry?.enquiry?.province_id?.province_name)} />
              <InfoRow label="City" value={renderValue(enquiry?.enquiry?.city_id?.city_name)} />
              <InfoRow label="Area" value={renderValue(enquiry?.enquiry?.area_id?.area_name)} />
              <InfoRow label="Camp" value={renderValue(camp?.camp_name || enquiry?.enquiry?.camp_id?.camp_name)} />
              <InfoRow label="Camp Type" value={renderValue(camp?.camp_type)} />
              <InfoRow label="Camp Capacity" value={renderValue(camp?.camp_capacity)} />
              <InfoRow label="Camp Occupancy" value={renderValue(camp?.camp_occupancy)} />
              <InfoRow label="Latitude" value={renderValue(latitude)} />
              <InfoRow label="Longitude" value={renderValue(longitude)} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Camp Stakeholders</h2>
            <div className="grid gap-2 md:grid-cols-3">
              <InfoRow label="Landlord" value={renderValue(camp?.landlord_id?.landlord_name)} />
              <InfoRow label="Real Estate" value={renderValue(camp?.realestate_id?.company_name)} />
              <InfoRow label="Client Company" value={renderValue(camp?.client_company_id?.client_company_name)} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Enquiry Users</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <InfoRow
                label="Enquiry Brought By"
                value={renderUserList(enquiry?.enquiry?.enquiry_brought_by)}
              />
              <InfoRow
                label="Meeting Initiated By"
                value={renderUserList(enquiry?.enquiry?.meeting_initiated_by)}
              />
              <InfoRow
                label="Project Closed By"
                value={renderUserList(enquiry?.enquiry?.project_closed_by)}
              />
              <InfoRow
                label="Project Managed By"
                value={renderUserList(enquiry?.enquiry?.project_managed_by)}
              />
              <InfoRow
                label="Enquiry User Notes"
                value={renderValue(enquiry?.enquiry?.enquiry_user_notes)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg">Contact Information</h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => router.push(`/admin/enquiries/${params.enquiry_id}/contacts`)}
              >
                Manage Contacts
              </Button>
            </div>
            {contacts.length === 0 && (
              <div className="border border-dashed border-slate-800 rounded-lg p-3 text-xs text-slate-400">
                No contacts added yet. Add one when you’re ready.
              </div>
            )}
            {contacts.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {contacts.map((contact: any, index: number) => (
                  <div
                    key={contact?._id || `${contact?.contact_name || "contact"}-${index}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <User size={14} /> {renderValue(contact?.contact_name, "Unnamed Contact")}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1"><Phone size={12} /> {renderValue(contact?.contact_phone)}</span>
                      <span className="flex items-center gap-1"><Mail size={12} /> {renderValue(contact?.contact_email)}</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <InfoRow label="Designation" value={renderValue(contact?.contact_designation)} />
                      <InfoRow label="Decision Maker" value={contact?.is_decision_maker ? "Yes" : "No"} />
                      <InfoRow label="Authority" value={renderValue(contact?.contact_authorization)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Head Office</h2>
            {enquiry?.head_office ? (
              <div className="grid gap-2 md:grid-cols-2">
                <InfoRow label="Phone" value={renderValue(enquiry?.head_office?.phone)} />
                <InfoRow
                  label="Geo Location"
                  value={enquiry?.head_office?.geo_location ? (
                    <a
                      href={enquiry.head_office.geo_location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      View Location
                    </a>
                  ) : (
                    "Not specified"
                  )}
                />
                <InfoRow label="Address" value={renderValue(enquiry?.head_office?.address)} />
                <InfoRow label="Other Details" value={renderValue(enquiry?.head_office?.other_details)} />
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 rounded-lg p-3 text-xs text-slate-400">
                Head office details haven’t been added yet.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-lg flex items-center gap-2"><Wifi size={16} /> Wi-Fi / Internet</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <InfoRow label="Status" value={wifiStatusLabel} />
              <InfoRow label="Type" value={renderValue(enquiry?.enquiry?.wifi_type, "Not specified")} />
            </div>
            {wifiAvailability === true && (
              <>
                {enquiry?.enquiry?.wifi_type === "Existing Contractor" && (
                  <div className="grid gap-2 md:grid-cols-2">
                    <InfoRow label="Contractor" value={renderValue(enquiry?.external_provider?.contractor_name)} />
                    <InfoRow label="Plan / Package" value={renderValue(enquiry?.external_provider?.contract_package)} />
                    <InfoRow label="Speed (Mbps)" value={renderValue(enquiry?.external_provider?.contract_speed)} />
                    <InfoRow label="Contract Start" value={renderDate(enquiry?.external_provider?.contract_start_date)} />
                    <InfoRow label="Contract End" value={renderDate(enquiry?.external_provider?.contract_end_date)} />
                    <InfoRow label="Pain Points" value={renderValue(enquiry?.external_provider?.plain_points || enquiry?.external_provider?.pain_points)} />
                  </div>
                )}
                {enquiry?.enquiry?.wifi_type === "Personal WiFi" && (
                  <div className="grid gap-2 md:grid-cols-2">
                    <InfoRow label="Provider / Plan" value={renderValue(enquiry?.personal_provider?.personal_plan)} />
                    <InfoRow label="Start Date" value={renderDate(enquiry?.personal_provider?.personal_start_date)} />
                    <InfoRow label="End Date" value={renderDate(enquiry?.personal_provider?.personal_end_date)} />
                    <InfoRow label="Monthly Price" value={renderDecimal(enquiry?.personal_provider?.personal_monthly_price)} />
                  </div>
                )}
                {enquiry?.enquiry?.wifi_type === "Other Sources" && (
                  <InfoRow label="Setup Details" value={renderValue(enquiry?.enquiry?.wifi_setup)} />
                )}
              </>
            )}
            {wifiAvailability === false && (
              <InfoRow label="Expected Monthly Price" value={renderDecimal(enquiry?.enquiry?.expected_wifi_cost)} />
            )}
            {(wifiAvailability === null || wifiAvailability === undefined) && (
              <div className="border border-dashed border-slate-800 rounded-lg p-3 text-xs text-slate-400">
                Wi-Fi information hasn’t been specified yet.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Lease & Competition</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <InfoRow label="Lease Expiry" value={renderDate(enquiry?.enquiry?.lease_expiry_due)} />
              <InfoRow label="Rent Terms" value={renderValue(enquiry?.enquiry?.rent_terms)} />
              <InfoRow label="Competition Presence" value={renderBool(enquiry?.enquiry?.competition_status)} />
              <InfoRow label="Competition Notes" value={renderValue(enquiry?.enquiry?.competition_notes)} />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Follow-up & Notes</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <InfoRow label="Status" value={statusLabel} />
              <InfoRow label="Priority" value={priorityLabel} />
              <InfoRow label="Alert Date" value={renderDate(enquiry?.enquiry?.alert_date)} />
              <InfoRow label="Next Action" value={renderValue(enquiry?.enquiry?.next_action)} />
              <InfoRow label="Next Action Due" value={renderDate(enquiry?.enquiry?.next_action_due)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-lg">Comments</h2>
              {hasMoreComments && (
                <Button variant="outline" size="sm" onClick={() => setCommentsDialogOpen(true)}>
                  View more
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400">Showing latest comments first.</p>

            {isCommentsLoading && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
                Loading comments...
              </div>
            )}

            {!isCommentsLoading && sortedComments.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
                No comments yet.
              </div>
            )}

            {!isCommentsLoading && recentComments.map((comment: any) => renderCommentCard(comment))}
          </div>

          <Dialog open={commentsDialogOpen} onOpenChange={setCommentsDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>All Comments</DialogTitle>
                <DialogDescription>Showing all enquiry comments, newest first.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-1">
                {sortedComments.map((comment: any) => renderCommentCard(comment))}
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="font-semibold text-lg mb-2">Created By</h2>
              <div className="flex items-center gap-3 border border-slate-800 p-3 rounded-xl bg-slate-900/40">
                <Avatar size={45} src="https://api.dicebear.com/7.x/personas/svg" />
                <div>
                  <h3 className="font-semibold text-sm">{renderValue(enquiry?.enquiry?.createdBy?.name, "Unknown")}</h3>
                </div>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-lg mb-2">Assigned To</h2>
              <div className="flex items-center gap-3 border border-slate-800 p-3 rounded-xl bg-slate-900/40">
                <Avatar size={45} src="https://api.dicebear.com/7.x/personas/svg" />
                <div>
                  <h3 className="font-semibold text-sm">{renderAssignedUsers(enquiry?.assigned?.assigned_to)}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <InfoRow label="Created" value={renderDate(enquiry?.enquiry?.createdAt)} />
            <InfoRow label="Last Updated" value={renderDate(enquiry?.enquiry?.updatedAt)} />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.replace(`/admin/enquiries/${params.enquiry_id}/forward-enquiry`)}
              className="flex items-center gap-1"
              disabled={!enquiry?.enquiry?.is_active}
            >
              Forward Enquiry
            </Button>
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

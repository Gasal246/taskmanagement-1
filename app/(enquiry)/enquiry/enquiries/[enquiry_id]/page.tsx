"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, User, Clock, BadgeCheck, UserCircle2 } from "lucide-react";
import { Avatar } from "antd";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGetEnquiryByIdForStaffs } from "@/query/enquirymanager/queries";
import { formatDateTiny } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";


export default function SingleEnquiryPage() {
  const router = useRouter();
  const params = useParams<{ enquiry_id: string }>();
  const { data: enquiry, isLoading } = useGetEnquiryByIdForStaffs(params.enquiry_id);
  const params2 = useSearchParams();
  const from = params2.get("from");
  useEffect(() => {
    console.log("enquiry: ", enquiry);
  }, [enquiry]);

  const openMap = () => {
    window.open(`https://www.google.com/maps?q=${enquiry.enquiry.camp_id?.latitude},${enquiry.enquiry.camp_id?.longitude}`, "_blank");
  };

  return (
    <div className='p-5 pb-20'>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {from == "created" ? <BreadcrumbLink onClick={() => router.replace("/enquiry/enquiries")}>Enquiries</BreadcrumbLink> : <BreadcrumbLink onClick={() => router.replace("/enquiry/enquiries/assigned")}>Assigned Enquiries</BreadcrumbLink>}
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Enquiry Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="p-4 pb-10 text-slate-100">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserCircle2 size={20} /> Enquiry Details
          </h1>
          <Button
          disabled={enquiry?.enquiry?.is_edit_req}
          onClick={()=> router.push(`/enquiry/enquiries/${params.enquiry_id}/edit`)}
          >
            Edit
          </Button>
        </div>

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
                        <p className="text-sm">Latitude: {enquiry?.enquiry?.camp_id?.latitude}</p>
            <p className="text-sm">Longitude: {enquiry?.enquiry?.camp_id?.longitude}</p>
            <Button onClick={openMap}>Go to Location</Button>
          </div>

          {enquiry?.head_office &&
            <div className="mt-5 space-y-2">
              <h2 className="font-semibold text-lg mb-2">Head Office Details</h2>

              <p className="text-sm">Phone: {enquiry?.head_office?.phone}</p>
              <p className="text-sm">Location: {enquiry?.head_office?.geo_location}</p>
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
                        onClick={()=> router.push(`/enquiry/enquiries/${params.enquiry_id}/contacts`)}
                        >Show More</Button>
          </div>

          {/* CREATED BY */}
          <div className="mt-5">
            <h2 className="font-semibold text-lg mb-2">Created By</h2>
            <div className="flex items-center gap-3 border border-slate-800 p-3 rounded-xl bg-slate-900/40">
              <Avatar size={50} src="https://api.dicebear.com/7.x/personas/svg" />
              <div>
                <h3 className="font-semibold text-sm">{enquiry?.enquiry?.createdBy?.name}</h3>
                <p className="text-xs text-slate-400">Agent</p>
              </div>
            </div>
          </div>



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
            {enquiry?.canForward && (
              <Button
                onClick={() => router.replace(`/enquiry/enquiries/${params.enquiry_id}/view-assigned`)}
                className="flex items-center gap-1"
              >
                View Assigned Action
              </Button>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}

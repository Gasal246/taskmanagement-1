/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Building2, FileText, Loader2, Plus, Trash2, Upload, Wifi, PhoneCall, X, Info } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    useGetEnquiryById,
    useGetEnquiryContacts,
    useGetEqAreas,
    useGetEqCampsByArea,
    useGetEqCampsById,
    useGetEqCities,
    useGetEqCountries,
    useGetEqProvince,
    useGetEqRegions,
    useGetEqUsers,
    useUpdateEnquiry
} from "@/query/enquirymanager/queries";
import { toast } from "sonner";
import { EQ_CAMP_TYPES, EQ_CAPACITY_LIMITS, Eq_CAPACITY_OPTIONS } from "@/lib/constants";
import { useParams, useRouter } from "next/navigation";
import LocationPicker from "@/components/enquiries/LocationPicker";
import EnquiryUserMultiSelect from "@/components/enquiries/EnquiryUserMultiSelect";
import Image from "next/image";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Tooltip } from "antd";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useQueryClient } from "@tanstack/react-query";

const priorityLevels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const ENQUIRY_STATUS_OPTIONS = [
    "Lead Received",
    "Initial Meeting Over",
    "Survey Completed",
    "Proposal Submitted",
    "Waiting For Client Response",
    "Project Awarded",
] as const;

const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

/* =========== SCHEMA =========== */
const enquirySchema = z.object({
    enquiry_id: z.string(),
    country: z.string().optional(),
    region: z.string().optional(),
    province: z.string().optional(),
    city: z.string().optional(),

    area_input_mode: z.enum(["existing", "new"]).default("existing"),
    area: z.string().optional(),
    area_name_request: z.string().optional(),

    camp_input_mode: z.enum(["existing", "new"]).default("existing"),
    camp: z.string().optional(),
    camp_name_request: z.string().optional(),

    camp_type: z.string().optional(),
    client_company: z.string().optional(),
    landlord: z.string().optional(),
    real_estate: z.string().optional(),

    latitude: z.string(),
    longitude: z.string(),
    enquiry_brought_by: z.array(z.string()).optional(),
    meeting_initiated_by: z.array(z.string()).optional(),
    project_closed_by: z.array(z.string()).optional(),
    project_managed_by: z.array(z.string()).optional(),
    enquiry_user_notes: z.string().optional(),
    coordinates: z.string().optional(),

    camp_capacity: z.string().optional(),
    camp_occupancy: z.string().optional(),

    contacts: z.array(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        designation: z.string().optional(),
        is_decision_maker: z.string().optional(),
        authority_level: z.string().optional(),
    })).optional(),

    wifi_available: z.string().optional(),
    expected_monthly_price: z.string().optional(),
    other_wifi_details: z.string().optional(),
    wifi_type: z.string().optional(),
    contractor_name: z.string().optional(),
    contract_start: z.string().optional(),
    contract_expiry: z.string().optional(),
    wifi_plan: z.string().optional(),
    speed_mbps: z.string().optional(),
    service_quality: z.string().optional(),
    pain_points: z.string().optional(),

    provider_plan: z.string().optional(),
    personal_wifi_start: z.string().optional(),
    personal_wifi_expiry: z.string().optional(),
    personal_wifi_price: z.string().optional(),

    head_office_address: z.string().optional(),
    head_office_contact: z.string().optional(),
    head_office_location: z.string().optional(),
    head_office_details: z.string().optional(),

    lease_expiry_due: z.string().optional(),
    rent_terms: z.string().optional(),

    competition_status: z.string().optional(),
    competition_notes: z.string().optional(),

    priority: z.enum(priorityLevels as [string, ...string[]]).optional().or(z.literal("")),

    followup_status: z.string().optional(),
    alert_date: z.string().optional(),
    next_action: z.string().optional(),
    next_action_due: z.string().optional(),
    comments: z.string().optional(),

    images: z.any().optional(),

}).superRefine((values, ctx) => {
    if (values.camp_capacity && values.camp_occupancy) {
        const limit = EQ_CAPACITY_LIMITS[values.camp_capacity];
        const occupancy = Number(values.camp_occupancy);

        if (!Number.isNaN(occupancy) && limit && occupancy > limit) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["camp_occupancy"],
                message: "Camp occupancy cannot exceed Camp Capacity",
            });
        }
    }
});

/* =========== COMPONENT =========== */
export default function EditEnquiry() {
    const router = useRouter();
    const params = useParams<{ enquiry_id: string }>();
    const { businessData } = useSelector((state: RootState) => state.user);
    const queryClient = useQueryClient();
    const [showHeadOffice, setShowHeadOffice] = useState(false);
    const [countries, setCountries] = useState([]);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [docPreview, setDocPreview] = useState<string | null>(null);
    const [docType, setDocType] = useState<string>('');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [uploadedDoc, setUploadedDoc] = useState<{ url: string; name: string; type?: string; storagePath?: string } | null>(null);
    const [removingDoc, setRemovingDoc] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const priorityCapacityMap = Eq_CAPACITY_OPTIONS.map((capacity, index) => ({
        value: `${index + 1}`,
        priority: `${index + 1}`,
        capacity,
        capacityLabel: capacity,
    }));

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { mutateAsync: UpdateEnquiry, isPending: isUpdating } = useUpdateEnquiry();
    const { data: enquiry, isLoading: isEnquiryLoading } = useGetEnquiryById(params.enquiry_id);
    const { data: contactsData } = useGetEnquiryContacts(params.enquiry_id);
    const { data: eqUsers } = useGetEqUsers(businessData?._id, "users");

    const form = useForm<any>({
        resolver: zodResolver(enquirySchema),
        defaultValues: {
            enquiry_id: params.enquiry_id,
            country: "",
            region: "",
            province: "",
            city: "",
            area: "",
            area_name_request: "",
            camp: "",
            camp_name_request: "",
            camp_type: "",
            client_company: "",
            landlord: "",
            real_estate: "",
            camp_capacity: "",
            camp_occupancy: "",
            wifi_available: "No",
            wifi_type: "",
            contractor_name: "",
            contract_start: "",
            contract_expiry: "",
            wifi_plan: "",
            speed_mbps: "",
            pain_points: "",
            provider_plan: "",
            personal_wifi_start: "",
            personal_wifi_expiry: "",
            personal_wifi_price: "",
            followup_status: ENQUIRY_STATUS_OPTIONS[0],
            area_input_mode: "existing",
            camp_input_mode: "existing",
            expected_monthly_price: "",
            other_wifi_details: "",
            head_office_address: "",
            head_office_contact: "",
            head_office_location: "",
            head_office_details: "",
            lease_expiry_due: "",
            rent_terms: "",
            competition_status: "",
            competition_notes: "",
            priority: "",
            alert_date: "",
            next_action: "",
            next_action_due: "",
            comments: "",
            latitude: "",
            longitude: "",
            coordinates: "",
            contacts: [],
            enquiry_brought_by: [],
            meeting_initiated_by: [],
            project_closed_by: [],
            project_managed_by: [],
            enquiry_user_notes: ""
        }
    });

    const selectedCampId = form.watch("camp");
    const camp_id = selectedCampId;
    const baseCampId = (enquiry?.enquiry?.camp_id?._id ?? enquiry?.enquiry?.camp_id) || "";
    const activeCampId = selectedCampId || baseCampId;
    const { data: campData, isLoading: isCampDetailsLoading } = useGetEqCampsById(activeCampId);
    const selectedCamp = campData?.camp;

    const country_id = form.watch("country");
    const region_id = form.watch("region");
    const province_id = form.watch("province");
    const city_id = form.watch("city");
    const area_id = form.watch("area");
    const areaInputMode = form.watch("area_input_mode");
    const campInputMode = form.watch("camp_input_mode");
    const isNewCamp = campInputMode === "new" || areaInputMode == "new";
    const isExistingCampMode = areaInputMode === "existing" && campInputMode === "existing";
    const coordinatesValue = form.watch("coordinates");
    const { latitude: coordinatesLat, longitude: coordinatesLng } = parseCoordinates(coordinatesValue || "");
    const coordsForDisplay = {
        lat: toNumberOrNull(coordinatesLat),
        lng: toNumberOrNull(coordinatesLng),
    };
    const { data: regions, isLoading: isRegionLoading } = useGetEqRegions(country_id);
    const { data: provinces, isLoading: isProvinceLoading } = useGetEqProvince(region_id);
    const { data: cities, isLoading: isCityLoading } = useGetEqCities(province_id);
    const { data: areas, isLoading: isAreaLoading } = useGetEqAreas(city_id);
    const { data: camps, isLoading: isCampListLoading } = useGetEqCampsByArea(area_id);
    const userOptions = useMemo(() => {
        return (eqUsers?.users || [])
            .map((userEntry: any) => {
                const user = userEntry?.user_id || userEntry;
                if (!user?._id) return null;
                return {
                    id: String(user._id),
                    name: user?.name || "Unknown User",
                    email: user?.email || "",
                };
            })
            .filter(Boolean);
    }, [eqUsers?.users]);
    const campCapacityMissing = isExistingCampMode
        && !!camp_id
        && !!selectedCamp
        && (selectedCamp?.camp_capacity === null || selectedCamp?.camp_capacity === undefined || selectedCamp?.camp_capacity === "");
    const campOccupancyMissing = isExistingCampMode
        && !!camp_id
        && !!selectedCamp
        && (selectedCamp?.camp_occupancy === null || selectedCamp?.camp_occupancy === undefined || selectedCamp?.camp_occupancy === "");


    const { control, handleSubmit } = form;
    const { fields, append, remove, replace } = useFieldArray({ control, name: "contacts" });
    const selectClassName = "w-full rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0";

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "";
        return new Date(dateString).toISOString().split("T")[0];
    };

    const normalizeId = (value: any) => {
        if (!value) return "";
        return typeof value === "string" ? value : value?._id || "";
    };

    const normalizeDecimal = (value: any) => {
        if (value === null || value === undefined) return "";
        const resolved = value?.$numberDecimal ?? value;
        return String(resolved);
    };
    const normalizeUserIds = (value: any) => {
        if (!Array.isArray(value)) return [];
        return value
            .map((entry) => (typeof entry === "string" ? entry : entry?._id))
            .filter(Boolean);
    };
    function toNumberOrNull(value: string) {
        if (!value) return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }
    function parseCoordinates(value: string) {
        const [lat, lng] = value.split(",").map((item) => item.trim());
        return {
            latitude: lat || "",
            longitude: lng || "",
        };
    }

    const fetchCountries = async () => {
        const res = await GetCountries();
        if (res?.status == 200) {
            setCountries(res.countries);
        }
    };

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (!enquiry?.enquiry) return;

        const camp = campData?.camp;
        const isApprovedEnquiry = Boolean(enquiry?.enquiry?.is_active);
        const initialLatitudeRaw = camp?.latitude ?? enquiry?.enquiry?.latitude ?? "";
        const initialLongitudeRaw = camp?.longitude ?? enquiry?.enquiry?.longitude ?? "";
        const initialLatitude = initialLatitudeRaw === "" ? "" : String(initialLatitudeRaw);
        const initialLongitude = initialLongitudeRaw === "" ? "" : String(initialLongitudeRaw);
        const headOffice = camp?.headoffice_id;
        const mappedContacts = (contactsData?.contacts || campData?.contacts || []).map((contact: any) => ({
            name: contact?.contact_name || "",
            phone: contact?.contact_phone || "",
            email: contact?.contact_email || "",
            designation: contact?.contact_designation || "",
            is_decision_maker: contact?.is_decision_maker ? "Yes" : "No",
            authority_level: contact?.contact_authorization || "",
        }));

        const hasHeadOffice = Boolean(
            headOffice?.phone ||
            headOffice?.address ||
            headOffice?.geo_location ||
            headOffice?.other_details
        );

        setShowHeadOffice(hasHeadOffice);

        form.reset({
            enquiry_id: params.enquiry_id,
            country: normalizeId(enquiry?.enquiry?.country_id),
            region: normalizeId(enquiry?.enquiry?.region_id),
            province: normalizeId(enquiry?.enquiry?.province_id),
            city: normalizeId(enquiry?.enquiry?.city_id),
            area_input_mode: "existing",
            area: normalizeId(enquiry?.enquiry?.area_id),
            camp_input_mode: isApprovedEnquiry ? "existing" : "new",
            camp: isApprovedEnquiry ? normalizeId(enquiry?.enquiry?.camp_id) : "",
            camp_name_request: camp?.camp_name || "",
            camp_type: camp?.camp_type || "",
            client_company: camp?.client_company_id?.client_company_name || "",
            landlord: camp?.landlord_id?.landlord_name || "",
            real_estate: camp?.realestate_id?.company_name || "",
            latitude: initialLatitude,
            longitude: initialLongitude,
            coordinates: (initialLatitude || initialLongitude) ? `${initialLatitude}, ${initialLongitude}` : "",
            camp_capacity: camp?.camp_capacity || "",
            camp_occupancy: camp?.camp_occupancy ? String(camp?.camp_occupancy) : "",
            contacts: mappedContacts,
            wifi_available:
                enquiry?.enquiry?.wifi_available === true
                    ? "Yes"
                    : enquiry?.enquiry?.wifi_available === false
                        ? "No"
                        : "not-specified",
            expected_monthly_price: normalizeDecimal(enquiry?.enquiry?.expected_wifi_cost),
            other_wifi_details: enquiry?.enquiry?.wifi_setup || "",
            wifi_type: enquiry?.enquiry?.wifi_type || "",
            contractor_name: enquiry?.external_provider?.contractor_name || "",
            contract_start: formatDate(enquiry?.external_provider?.contract_start_date) || "",
            contract_expiry: formatDate(enquiry?.external_provider?.contract_end_date) || "",
            wifi_plan: enquiry?.external_provider?.contract_package || "",
            speed_mbps: enquiry?.external_provider?.contract_speed || "",
            pain_points: enquiry?.external_provider?.plain_points || enquiry?.external_provider?.pain_points || "",
            provider_plan: enquiry?.personal_provider?.personal_plan || "",
            personal_wifi_start: formatDate(enquiry?.personal_provider?.personal_start_date) || "",
            personal_wifi_expiry: formatDate(enquiry?.personal_provider?.personal_end_date) || "",
            personal_wifi_price: normalizeDecimal(enquiry?.personal_provider?.personal_monthly_price),
            head_office_address: headOffice?.address || "",
            head_office_contact: headOffice?.phone || "",
            head_office_location: headOffice?.geo_location || "",
            head_office_details: headOffice?.other_details || "",
            lease_expiry_due: formatDate(enquiry?.enquiry?.lease_expiry_due) || "",
            rent_terms: enquiry?.enquiry?.rent_terms || "",
            competition_status: enquiry?.enquiry?.competition_status ? "Yes" : "No",
            competition_notes: enquiry?.enquiry?.competition_notes || "",
            priority: enquiry?.enquiry?.priority ? String(enquiry?.enquiry?.priority) : undefined,
            followup_status: enquiry?.enquiry?.status || ENQUIRY_STATUS_OPTIONS[0],
            alert_date: formatDate(enquiry?.enquiry?.alert_date) || "",
            next_action: enquiry?.enquiry?.next_action || "",
            next_action_due: formatDate(enquiry?.enquiry?.next_action_due) || "",
            comments: enquiry?.enquiry?.comments || "",
            enquiry_brought_by: normalizeUserIds(enquiry?.enquiry?.enquiry_brought_by),
            meeting_initiated_by: normalizeUserIds(enquiry?.enquiry?.meeting_initiated_by),
            project_closed_by: normalizeUserIds(enquiry?.enquiry?.project_closed_by),
            project_managed_by: normalizeUserIds(enquiry?.enquiry?.project_managed_by),
            enquiry_user_notes: enquiry?.enquiry?.enquiry_user_notes || ""
        });

        replace(mappedContacts);
    }, [enquiry, campData, contactsData]);

    useEffect(() => {
        if (isExistingCampMode) {
            return;
        }
        form.setValue("camp_capacity", "");
        form.setValue("camp_occupancy", "");
    }, [isExistingCampMode]);

    useEffect(() => {
        if (!isExistingCampMode) {
            return;
        }

        const capacityValue = selectedCamp?.camp_capacity;
        const occupancyValue = selectedCamp?.camp_occupancy;

        form.setValue("camp_capacity", capacityValue === null || capacityValue === undefined ? "" : String(capacityValue));
        form.setValue("camp_occupancy", occupancyValue === null || occupancyValue === undefined ? "" : String(occupancyValue));
    }, [activeCampId, isExistingCampMode, selectedCamp?.camp_capacity, selectedCamp?.camp_occupancy]);

    const isPdf = (type: string) => type?.toLowerCase().includes('pdf');
    const isImage = (type: string) => type?.startsWith('image/');
    const getFileExtension = (file: File) => {
        const ext = file?.name?.split('.').pop();
        if (ext && ext.length < 8) return ext.toLowerCase();
        if (isPdf(file?.type)) return 'pdf';
        if (isImage(file?.type)) return file.type.split('/')[1];
        return 'bin';
    };
    const normalizeDocName = (name: string) => name.trim().replace(/\s+/g, ' ');
    const slugifyDocName = (name: string) =>
        normalizeDocName(name || 'file')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') || `file-${Date.now()}`;

    const handleEnquiryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setDocFile(null);
            setDocPreview(null);
            setDocType('');
            return;
        }
        if (!(isPdf(file.type) || isImage(file.type))) {
            toast.error("Only images or PDFs are allowed.");
            setDocFile(null);
            setDocPreview(null);
            setDocType('');
            return;
        }
        if (file.size > MAX_DOC_SIZE) {
            toast.error("File too large (max 5MB).");
            setDocFile(null);
            setDocPreview(null);
            setDocType('');
            return;
        }
        setDocFile(file);
        setDocType(file.type);
        if (isImage(file.type)) {
            const url = URL.createObjectURL(file);
            setDocPreview(url);
        } else {
            setDocPreview(null);
        }
    };

    const handleUploadEnquiryDoc = async () => {
        if (uploadingDoc) return;
        if (!docFile) {
            toast.error("Please select a file first.");
            return;
        }
        const safeName = slugifyDocName(docFile.name.replace(/\.[^/.]+$/, ''));
        const extension = getFileExtension(docFile);
        const storagePath = `enquiries/temp/${Date.now()}-${safeName}/file.${extension}`;
        const storageRef = ref(storage, storagePath);
        setUploadingDoc(true);
        try {
            await uploadBytes(storageRef, docFile);
            const url = await getDownloadURL(storageRef);
            setUploadedDoc({ url, name: docFile.name, type: docType || docFile.type, storagePath });
            toast.success("File uploaded");
        } catch (err) {
            console.log(err);
            toast.error("Upload failed");
        } finally {
            if (docPreview && docPreview.startsWith('blob:')) URL.revokeObjectURL(docPreview);
            setDocFile(null);
            setDocPreview(null);
            setDocType('');
            setUploadingDoc(false);
        }
    };

    const handleRemoveUploadedDoc = async () => {
        if (removingDoc) return;
        setRemovingDoc(true);
        try {
            if (uploadedDoc?.storagePath) {
                await deleteObject(ref(storage, uploadedDoc.storagePath));
            }
        } catch (err) {
            console.log(err);
        } finally {
            if (docPreview && docPreview.startsWith('blob:')) URL.revokeObjectURL(docPreview);
            setUploadedDoc(null);
            setDocPreview(null);
            setDocFile(null);
            setDocType('');
            setRemovingDoc(false);
        }
    };

    const onSubmit = async (data: any) => {
        if (data.camp_capacity && data.camp_occupancy) {
            const limit = EQ_CAPACITY_LIMITS[data.camp_capacity];
            if (Number(data.camp_occupancy) > limit) {
                return toast.error("Camp occupancy cannot exceed Camp Capacity");
            }
        }
        const payload = { ...data, enquiry_id: params.enquiry_id };
        if (payload.coordinates) {
            const { latitude, longitude } = parseCoordinates(payload.coordinates);
            payload.latitude = latitude;
            payload.longitude = longitude;
        }
        delete payload.coordinates;
        if (uploadedDoc?.url) {
            payload.images = [uploadedDoc.url];
        }
        const res = await UpdateEnquiry(payload);
        if (res?.status == 200) {
            toast.success(res?.message || "Enquiry Updated");
            queryClient.invalidateQueries({ queryKey: ["enquiry", params.enquiry_id] });
            return router.replace(`/admin/enquiries/${params.enquiry_id}`);
        } else {
            toast.error(res?.message || "Failed to update enquiry");
        }
    };
    const onInvalid = () => {
        toast.error("Please check the form values before updating.");
    };

    if (isEnquiryLoading || isCampDetailsLoading) {
        return (
            <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-cyan-400" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-5 pb-10">

            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/admin/enquiries">Enquiries</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Edit Enquiry</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="bg-gradient-to-r from-slate-950/80 via-slate-900/70 to-cyan-950/30 border border-slate-800/80 p-4 rounded-xl mt-2 shadow-[0_10px_30px_-20px_rgba(34,211,238,0.35)]">
                <h1 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                    <Building2 size={16} className="text-cyan-300" /> Edit Enquiry
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                    Update enquiry details with the same structured workflow and visuals as the add enquiry experience.
                </p>
            </div>

            <div className="mt-3 bg-gradient-to-br from-slate-950/80 via-slate-900/75 to-cyan-950/20 p-4 md:p-5 rounded-xl border border-slate-800/80 pb-16">

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-10">

                        {/* ------------------------------------ LOCATION ------------------------------------ */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* COUNTRY */}
                            <FormField control={form.control} name="country" render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel className="text-xs text-slate-300 font-semibold">Country</FormLabel>
                                    <FormControl>
                                        <select
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            className={selectClassName}
                                        >
                                            <option value="">Select Country</option>
                                            {countries?.map((country: any) => (
                                                <option key={country._id} value={country._id}>{country.country_name}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                </FormItem>
                            )} />

                            {/* REGION */}
                            <FormField control={form.control} name="region" render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel className="text-xs text-slate-300 font-semibold">Region / Territory</FormLabel>
                                    <FormControl>
                                        <select
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            className={selectClassName}
                                        >
                                            <option value="">{country_id ? "Select Region" : "Select Country first"}</option>
                                            {regions?.region?.map((rg: any) => (
                                                <option key={rg._id} value={rg._id}>{rg.region_name}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                </FormItem>
                            )} />

                            {/* CITY + PROVINCE */}
                            <FormField control={form.control} name="province" render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel className="text-xs text-slate-300 font-semibold">Province</FormLabel>
                                    <FormControl>
                                        <select
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            className={selectClassName}
                                        >
                                            <option value="">{region_id ? "Select Province" : "Select Region first"}</option>
                                            {provinces?.provinces?.map((p: any) => (
                                                <option key={p._id} value={p._id}>{p.province_name}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="city" render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel className="text-xs text-slate-300 font-semibold">City</FormLabel>
                                    <FormControl>
                                        <select
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            className={selectClassName}
                                        >
                                            <option value="">{province_id ? "Select City" : "Select Province first"}</option>
                                            {cities?.cities?.map((c: any) => (
                                                <option key={c._id} value={c._id}>{c.city_name}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                </FormItem>
                            )} />

                            </div>

                            <div className="w-full lg:w-[56%] rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/55 via-slate-950/45 to-cyan-950/10 p-4 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.9)]">
                                <div className="mb-3">
                                    <p className="text-xs font-semibold text-slate-200">Area Selection</p>
                                    <p className="text-[11px] text-slate-400">Choose an existing area or request a new area for review.</p>
                                </div>

                                <FormField control={form.control} name="area_input_mode" render={({ field }) => (
                                    <FormItem className="w-full">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs cursor-pointer transition ${field.value === "existing" ? "border-cyan-500/60 bg-cyan-950/20 text-slate-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16)]" : "border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-slate-600"}`}>
                                                <input type="radio" value="existing" checked={field.value === "existing"} onChange={() => form.setValue("area_input_mode", "existing")} className="accent-cyan-400" />
                                                <span>Select Existing</span>
                                            </label>
                                            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs cursor-pointer transition ${field.value === "new" ? "border-cyan-500/60 bg-cyan-950/20 text-slate-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16)]" : "border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-slate-600"}`}>
                                                <input type="radio" value="new" checked={field.value === "new"} onChange={() => form.setValue("area_input_mode", "new")} className="accent-cyan-400" />
                                                <span>Request New</span>
                                            </label>
                                        </div>
                                    </FormItem>
                                )} />

                                <div className="mt-3">
                                    {areaInputMode === "existing" && (
                                        <FormField control={form.control} name="area" render={({ field }) => (
                                            <FormItem className="w-full">
                                                <FormLabel className="text-xs text-slate-300 font-semibold">Area</FormLabel>
                                                <FormControl>
                                                    <select
                                                        value={field.value ?? ""}
                                                        onChange={field.onChange}
                                                        className={selectClassName}
                                                    >
                                                        <option value="">{city_id ? "Select Area" : "Select City first"}</option>
                                                        {areas?.areas?.map((a: any) => (
                                                            <option key={a._id} value={a._id}>{a.area_name}</option>
                                                        ))}
                                                    </select>
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                    )}

                                    {areaInputMode === "new" && (
                                        <FormField control={form.control} name="area_name_request" render={({ field }) => (
                                            <FormItem className="w-full">
                                                <FormLabel className="text-xs text-slate-300 font-semibold">New Area Name</FormLabel>
                                                <FormControl><Input placeholder="Enter area name to request" {...field} value={field.value ?? ""} className="bg-slate-950/40" /></FormControl>
                                            </FormItem>
                                        )} />
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* CAMP INPUT MODE TOGGLE */}
                        {areaInputMode == "existing" && (
                            <FormField
                                control={form.control}
                                name="camp_input_mode"
                                render={({ field }) => (
                                    <FormItem className="w-full lg:w-[56%] rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/55 via-slate-950/45 to-cyan-950/10 p-4 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.9)]">
                                        <div className="mb-3">
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Camp Selection</FormLabel>
                                            <p className="text-[11px] text-slate-400 mt-1">Choose an existing camp or request a new camp entry for the selected area.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs cursor-pointer transition ${field.value === "existing" ? "border-cyan-500/60 bg-cyan-950/20 text-slate-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16)]" : "border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-slate-600"}`}>
                                                <input
                                                    type="radio"
                                                    value="existing"
                                                    checked={field.value === "existing"}
                                                    onChange={() => form.setValue("camp_input_mode", "existing")}
                                                    className="accent-cyan-400"
                                                />
                                                <span>Select Existing Camp</span>
                                            </label>

                                            <label className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs cursor-pointer transition ${field.value === "new" ? "border-cyan-500/60 bg-cyan-950/20 text-slate-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16)]" : "border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-slate-600"}`}>
                                                <input
                                                    type="radio"
                                                    value="new"
                                                    checked={field.value === "new"}
                                                    onChange={() => form.setValue("camp_input_mode", "new")}
                                                    className="accent-cyan-400"
                                                />
                                                <span>Request New Camp</span>
                                            </label>
                                        </div>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* EXISTING CAMP SELECT */}
                        {campInputMode === "existing" && areaInputMode == "existing" && (
                            <FormField
                                control={form.control}
                                name="camp"
                                render={({ field }) => (
                                    <FormItem className="w-full lg:w-[56%] rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Camp Name</FormLabel>
                                        <FormControl>
                                            <select
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                className={selectClassName}
                                            >
                                                <option value="">{area_id ? "Select Camp Name" : "Select Area first"}</option>
                                                {camps?.camps?.map((c: any) => (
                                                    <option key={c._id} value={c._id}>
                                                        {c.camp_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* REQUEST NEW CAMP TEXT INPUT + LANDLORD/RE DETAILS/CLIENT */}
                        {(campInputMode === "new" || areaInputMode == "new") && (
                            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/45 via-slate-950/45 to-cyan-950/10 p-4 space-y-3">
                                <div>
                                    <p className="text-xs font-semibold text-slate-200">Camp Request Details</p>
                                    <p className="text-[11px] text-slate-400">Capture new camp details with enough context for review and follow-up.</p>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="camp_name_request"
                                    render={({ field }) => (
                                        <FormItem className="w-full lg:col-span-2">
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Requested Camp Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter camp name to request review" {...field} value={field.value ?? ""} className="bg-slate-950/40" />
                                            </FormControl>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                This will be reviewed and added to the system if valid.
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* CAMP TYPE */}
                                <FormField
                                    control={form.control}
                                    name="camp_type"
                                    render={({ field }) => (
                                        <FormItem className="w-full">
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Camp Type</FormLabel>
                                            <FormControl>
                                                <select
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    className={selectClassName}
                                                >
                                                    <option value="">Select Camp Type</option>
                                                    {EQ_CAMP_TYPES.map((c) => (
                                                        <option key={c} value={c}>
                                                            {c}
                                                        </option>
                                                    ))}
                                                </select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="landlord"
                                    render={({ field }) => (
                                        <FormItem className="w-full">
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Landlord / Owner</FormLabel>
                                            <FormControl><Input placeholder="Landlord / Owner Name" {...field} value={field.value ?? ""} className="bg-slate-950/40" /></FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="real_estate"
                                    render={({ field }) => (
                                        <FormItem className="w-full">
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Real Estate Company</FormLabel>
                                            <FormControl><Input placeholder="Real Estate Company Name" {...field} value={field.value ?? ""} className="bg-slate-950/40" /></FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="client_company"
                                    render={({ field }) => (
                                        <FormItem className="w-full lg:col-span-2">
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Client / End-User Company</FormLabel>
                                            <FormControl><Input placeholder="Client Company Name" {...field} value={field.value ?? ""} className="bg-slate-950/40" /></FormControl>
                                        </FormItem>
                                    )}
                                />


                                {/* HEAD OFFICE */}
                                {!showHeadOffice && (
                                    <button type="button" className="inline-flex items-center rounded-lg border border-cyan-800/60 bg-cyan-950/20 px-3 py-2 text-cyan-200 text-xs hover:bg-cyan-950/30 transition" onClick={() => setShowHeadOffice(true)}>
                                        + Add Head Office Details
                                    </button>
                                )}

                                {showHeadOffice && (
                                    <div className="lg:col-span-2 border border-slate-700/80 p-4 rounded-xl space-y-3 bg-slate-900/50">
                                        <div className="flex justify-between items-center">
                                            <h1 className="text-xs font-semibold text-slate-300">Head Office</h1>
                                            <button type="button" className="text-red-400 text-xs underline" onClick={() => setShowHeadOffice(false)}>
                                                Remove
                                            </button>
                                        </div>

                                        <FormField control={form.control} name="head_office_address" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs text-slate-300">Address</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                        )} />

                                        <FormField control={form.control} name="head_office_contact" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs text-slate-300">Contact Number</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                        )} />

                                        <FormField control={form.control} name="head_office_location" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs text-slate-300">Location</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                        )} />

                                        <FormField control={form.control} name="head_office_details" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs text-slate-300">Other Details</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                        )} />

                                    </div>
                                )}

                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* CAMP CAPACITY */}
                            <FormField control={form.control} name="camp_capacity" render={({ field }) => (
                                <FormItem className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
                                    <FormLabel className="text-xs text-slate-300">Camp Capacity</FormLabel>
                                    <FormControl>
                                        <select
                                            value={field.value ?? ""}
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                field.onChange(value);
                                                const matchedPriority = priorityCapacityMap.find((item) => item.capacity === value)?.priority;
                                                if (matchedPriority) {
                                                    form.setValue("priority", matchedPriority, { shouldDirty: true, shouldValidate: true });
                                                }
                                            }}
                                            className={selectClassName}
                                        >
                                            <option value="">Select Capacity</option>
                                            {priorityCapacityMap.map((item) => (
                                                <option key={item.capacity} value={item.capacity}>
                                                    {item.capacityLabel} (Priority {item.priority})
                                                </option>
                                            ))}
                                        </select>
                                    </FormControl>
                                    {campCapacityMissing && (
                                        <p className="text-xs text-red-400 mt-1">Please add the camp capacity</p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {/* OCCUPANCY */}
                            <FormField control={form.control} name="camp_occupancy" render={({ field }) => (
                                <FormItem className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
                                    <FormLabel className="text-xs text-slate-300">Current Occupancy</FormLabel>
                                    <Input type="number" {...field} value={field.value || ""} placeholder="Enter in numbers" className="bg-slate-950/40" />
                                    {campOccupancyMissing && (
                                        <p className="text-xs text-red-400 mt-1">Please add the camp occupancy</p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {/* CONTACTS */}
                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/50 to-slate-950/40 p-3 space-y-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="text-xs text-slate-300 font-semibold flex items-center gap-2">
                                        <PhoneCall size={14} className="text-cyan-300" /> Contacts
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">Add one or more contacts connected to this enquiry.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => append({ name: "", phone: "" })}
                                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-800/70 bg-cyan-950/20 px-3 py-2 text-xs font-medium text-cyan-200 hover:border-cyan-600/70 hover:bg-cyan-950/30 transition sm:self-start"
                                >
                                    <Plus size={14} /> {fields.length === 0 ? "Add Contact" : "Add Another Contact"}
                                </button>
                            </div>

                            {fields?.map((field, i) => (
                                <div key={field.id} className="border border-slate-800/80 bg-slate-950/30 p-3 rounded-xl space-y-3">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Input {...form.register(`contacts.${i}.name`)} placeholder="Name" className="w-full sm:w-1/2" />
                                        <Input {...form.register(`contacts.${i}.phone`)} placeholder="Phone" className="w-full sm:w-1/2" />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        <Input {...form.register(`contacts.${i}.email`)} placeholder="Email (optional)" />
                                        <Input {...form.register(`contacts.${i}.designation`)} placeholder="Designation" />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        <div>
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Is Decision Maker?</FormLabel>
                                            <select
                                                value={form.watch(`contacts.${i}.is_decision_maker`) ?? ""}
                                                onChange={(event) => form.setValue(`contacts.${i}.is_decision_maker`, event.target.value)}
                                                className={selectClassName}
                                            >
                                                <option value="">Select</option>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>

                                        <div>
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Authority Level</FormLabel>
                                            <select
                                                value={form.watch(`contacts.${i}.authority_level`) ?? ""}
                                                onChange={(event) => form.setValue(`contacts.${i}.authority_level`, event.target.value)}
                                                className={selectClassName}
                                            >
                                                <option value="">Authority Level</option>
                                                <option value="Operational">Operational</option>
                                                <option value="Manager">Manager</option>
                                                <option value="Director">Director</option>
                                                <option value="C-Level">C-Level</option>
                                            </select>
                                        </div>
                                    </div>

                                    {fields.length > 1 && (
                                        <button type="button" onClick={() => remove(i)} className="text-red-400 text-xs flex items-center gap-1">
                                            <Trash2 size={14} /> Remove Contact
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
                                <div>
                                    <p className="text-xs font-semibold text-slate-300">Coordinates (Optional)</p>
                                    <p className="text-[11px] text-slate-400">Type manually or use the location picker for a precise map point.</p>
                                </div>
                                <LocationPicker
                                    onChange={(loc: any) => {
                                        form.setValue("latitude", loc.lat);
                                        form.setValue("longitude", loc.lng);
                                        form.setValue("coordinates", `${loc.lat}, ${loc.lng}`);
                                    }}
                                    value={coordsForDisplay}
                                    showValues={false}
                                    className="sm:self-start"
                                    buttonClassName="h-8 px-3 text-xs"
                                />
                            </div>

                            <Input
                                type="text"
                                {...form.register("coordinates", {
                                    onChange: (event) => {
                                        const { latitude, longitude } = parseCoordinates(event.target.value);
                                        form.setValue("latitude", latitude);
                                        form.setValue("longitude", longitude);
                                    },
                                })}
                                placeholder="Latitude,Longitude"
                                className="bg-slate-950/40"
                            />

                            {coordsForDisplay?.lat !== null && coordsForDisplay?.lng !== null && (
                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                                    <div className="rounded-md border border-slate-800/80 bg-slate-950/40 px-2 py-1.5">
                                        Latitude: <span className="text-slate-200">{coordsForDisplay.lat}</span>
                                    </div>
                                    <div className="rounded-md border border-slate-800/80 bg-slate-950/40 px-2 py-1.5">
                                        Longitude: <span className="text-slate-200">{coordsForDisplay.lng}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* WIFI */}
                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/50 to-slate-950/40 p-3">
                            <div className="text-xs text-slate-300 font-semibold flex items-center gap-2"><Wifi size={14} className="text-cyan-300" /> Wi-Fi / Internet</div>
                            <p className="mt-1 text-[11px] text-slate-400">Capture availability, source type, and connection details in one organized section.</p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                                <FormField control={form.control} name="wifi_available" render={({ field }) => (
                                    <FormItem className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Wi-Fi Available?</FormLabel>
                                        <FormControl>
                                            <select
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                className={selectClassName}
                                            >
                                                <option value="">Select Wi-Fi Availability</option>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                                <option value="not-specified">Not Specified</option>
                                            </select>
                                        </FormControl>
                                    </FormItem>
                                )} />

                                <div className="rounded-xl border border-slate-800/70 bg-slate-950/25 p-3">
                                    <label className="text-xs text-slate-300 font-semibold block mb-2">Expected Monthly Price</label>
                                    <Input
                                        {...form.register("expected_monthly_price")}
                                        placeholder="Expected Monthly Price"
                                        disabled={form.watch("wifi_available") !== "No"}
                                        className={form.watch("wifi_available") !== "No" ? "bg-slate-900/40 opacity-70" : "bg-slate-950/40"}
                                    />
                                    {form.watch("wifi_available") !== "No" && (
                                        <p className="mt-1 text-[11px] text-slate-500">Enable this when Wi-Fi Available is set to `No`.</p>
                                    )}
                                </div>
                            </div>

                            {form.watch("wifi_available") === "Yes" && (
                                <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/20 p-3 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-slate-300">Connection Setup</p>
                                        <p className="text-[11px] text-slate-400">Select the current internet source to reveal relevant fields.</p>
                                    </div>
                                    <FormField control={form.control} name="wifi_type" render={({ field }) => (
                                        <FormItem className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                            <FormLabel className="text-xs text-slate-300 font-semibold">Wi-Fi Type</FormLabel>
                                            <FormControl>
                                                <select
                                                    value={field.value ?? ""}
                                                    onChange={field.onChange}
                                                    className={selectClassName}
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="Existing Contractor">Existing Contractor</option>
                                                    <option value="Personal WiFi">Personal WiFi</option>
                                                    <option value="Other Sources">Other Sources</option>
                                                </select>
                                            </FormControl>
                                        </FormItem>
                                    )} />

                                    {form.watch("wifi_type") === "Existing Contractor" && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3 lg:col-span-2">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Contractor Name</label>
                                                <Input {...form.register("contractor_name")} placeholder="Contractor Name" className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Contract Start Date</label>
                                                <Input type="date" {...form.register("contract_start")} className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Contract End Date</label>
                                                <Input type="date" {...form.register("contract_expiry")} className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Plan / Package</label>
                                                <Input {...form.register("wifi_plan")} placeholder="Plan / Package" className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Speed (Mbps)</label>
                                                <Input type="number" {...form.register("speed_mbps")} placeholder="Speed (Mbps)" className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3 lg:col-span-2">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Client Pain Points</label>
                                                <Textarea {...form.register("pain_points")} placeholder="Client Pain Points" className="bg-slate-950/40" />
                                            </div>
                                        </div>
                                    )}

                                    {form.watch("wifi_type") === "Personal WiFi" && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3 lg:col-span-2">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Provider / Plan</label>
                                                <Input {...form.register("provider_plan")} placeholder="Provider / Plan" className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Start Date</label>
                                                <Input type="date" {...form.register("personal_wifi_start")} className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">End Date</label>
                                                <Input type="date" {...form.register("personal_wifi_expiry")} className="bg-slate-950/40" />
                                            </div>
                                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                                <label className="text-xs text-slate-300 font-semibold block mb-2">Monthly Price</label>
                                                <Input type="number" {...form.register("personal_wifi_price")} placeholder="Monthly Price" className="bg-slate-950/40" />
                                            </div>
                                        </div>
                                    )}

                                    {form.watch("wifi_type") === "Other Sources" && (
                                        <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                            <label className="text-xs text-slate-300 font-semibold block mb-2">Other Internet Source Details</label>
                                            <Textarea {...form.register("other_wifi_details")} placeholder="Describe Internet Setup" className="bg-slate-950/40 min-h-[96px]" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/45 to-slate-950/35 p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <FormField control={form.control} name="lease_expiry_due" render={({ field }) => (
                                    <FormItem className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Lease Expiry Date</FormLabel>
                                        <Input type="date" {...field} className="bg-slate-950/40" />
                                    </FormItem>
                                )} />
                                <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                    <label className="text-xs text-slate-300 font-semibold block mb-2">Rent Terms</label>
                                    <Textarea {...form.register("rent_terms")} placeholder="Rent Terms" className="bg-slate-950/40 min-h-[86px]" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/45 to-slate-950/35 p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <FormField control={form.control} name="competition_status" render={({ field }) => (
                                    <FormItem className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Competition Presence</FormLabel>
                                        <FormControl>
                                            <select
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                                className={selectClassName}
                                            >
                                                <option value="">Competition Status</option>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                    <label className="text-xs text-slate-300 font-semibold block mb-2">Competition Notes</label>
                                    <Textarea {...form.register("competition_notes")} placeholder="Competition Notes" className="bg-slate-950/40 min-h-[86px]" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/45 to-slate-950/35 p-3">
                            <FormField control={form.control} name="priority" render={({ field }) => (
                                <FormItem>
                                    <Tooltip
                                        placement="topLeft"
                                        rootClassName="w-[360px]"
                                        className="w-[360px]"
                                        title={
                                            <div className="w-[360px] rounded-lg border border-slate-700/70 bg-slate-900/95 p-3 shadow-lg">
                                                <div className="grid grid-cols-2 gap-x-4 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                                                    <span>Priority</span>
                                                    <span>Capacity</span>
                                                </div>
                                                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-200">
                                                    {priorityCapacityMap.map((item) => (
                                                        <React.Fragment key={item.value}>
                                                            <span className="tabular-nums">{item.priority}</span>
                                                            <span className="whitespace-nowrap">{item.capacityLabel}</span>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        }
                                    >
                                        <FormLabel className="text-xs text-slate-300 font-semibold flex gap-1 items-center">
                                            <Info size={14} color="white" />
                                            Priority (1 - Low, 10 - High)
                                        </FormLabel>
                                    </Tooltip>
                                    <FormControl>
                                        <select
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            className={selectClassName}
                                        >
                                            <option value="">Priority</option>
                                            {priorityCapacityMap.map((item) => (
                                                <option key={item.value} value={item.value}>
                                                    {item.value} - {item.capacityLabel}
                                                </option>
                                            ))}
                                        </select>
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/45 to-slate-950/35 p-3">
                            <FormField control={form.control} name="followup_status" render={({ field }) => (
                                <FormItem className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                    <FormLabel className="text-xs text-slate-300 font-semibold">Follow-up Status</FormLabel>
                                    <FormControl>
                                        <select
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            className={selectClassName}
                                        >
                                            <option value="">Status</option>
                                            {ENQUIRY_STATUS_OPTIONS.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </FormControl>
                                </FormItem>
                            )} />
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/45 to-slate-950/35 p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <FormField control={form.control} name="alert_date" render={({ field }) => (
                                    <FormItem className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Alert Date</FormLabel>
                                        <Input type="date" {...field} className="bg-slate-950/40" />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="next_action_due" render={({ field }) => (
                                    <FormItem className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Next Action Due Date</FormLabel>
                                        <Input type="date" {...field} className="bg-slate-950/40" />
                                    </FormItem>
                                )} />
                                <div className="lg:col-span-2 rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                    <label className="text-xs text-slate-300 font-semibold block mb-2">Next Action</label>
                                    <Textarea {...form.register("next_action")} placeholder="Next Action" className="bg-slate-950/40 min-h-[92px]" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/45 to-slate-950/35 p-3">
                            <div className="rounded-lg border border-slate-800/70 bg-slate-950/25 p-3">
                                <label className="text-xs text-slate-300 font-semibold block mb-2">Comments</label>
                                <Textarea {...form.register("comments")} placeholder="Comments" className="bg-slate-950/40 min-h-[110px]" />
                            </div>
                        </div>

                        {/* ENQUIRY USERS */}
                        <div className="rounded-xl border border-slate-800/80 bg-gradient-to-r from-slate-900/45 to-slate-950/35 p-3 space-y-3">
                            <div>
                                <div className="text-xs text-slate-300 font-semibold">Enquiry Users</div>
                                <p className="mt-1 text-[11px] text-slate-400">Assign ownership and collaboration members for this enquiry lifecycle.</p>
                            </div>
                            <FormField
                                control={form.control}
                                name="enquiry_brought_by"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <EnquiryUserMultiSelect
                                            label="Enquiry Brought By"
                                            value={field.value || []}
                                            options={userOptions}
                                            onChange={field.onChange}
                                        />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="meeting_initiated_by"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <EnquiryUserMultiSelect
                                            label="Meeting Initiated By"
                                            value={field.value || []}
                                            options={userOptions}
                                            onChange={field.onChange}
                                        />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="project_closed_by"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <EnquiryUserMultiSelect
                                            label="Project Closed By"
                                            value={field.value || []}
                                            options={userOptions}
                                            onChange={field.onChange}
                                        />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="project_managed_by"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <EnquiryUserMultiSelect
                                            label="Project Managed By"
                                            value={field.value || []}
                                            options={userOptions}
                                            onChange={field.onChange}
                                        />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="enquiry_user_notes"
                                render={({ field }) => (
                                    <FormItem className="w-full">
                                        <FormLabel className="text-xs text-slate-300 font-semibold">Enquiry User Notes</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Comments..." {...field} className="bg-slate-950/40" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* IMAGES */}
                        <div className="grid gap-3 md:grid-cols-3 mt-2">
                            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-3 border border-slate-800/60">
                                <FormLabel className="text-xs text-slate-300 flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-cyan-400" /> Upload Images / Docs (optional)
                                </FormLabel>
                                <label className="mt-2 block border border-dashed border-slate-700 rounded-lg p-3 bg-slate-900/40 hover:border-cyan-700 transition cursor-pointer">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs text-slate-200">
                                            <Upload size={14} className="text-cyan-400" />
                                            <span className="truncate">{docFile ? docFile.name : 'Choose or drop a file (image/PDF, max 5MB)'}</span>
                                        </div>
                                        {docFile && <span className="text-[11px] text-slate-400">{(docFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                                    </div>
                                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleEnquiryFileChange} />
                                </label>
                                <div className="flex items-center gap-2 mt-3">
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={uploadingDoc}
                                        onClick={handleUploadEnquiryDoc}
                                        className="bg-cyan-700 hover:bg-cyan-800 text-xs"
                                    >
                                        {uploadingDoc ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-1" />Upload</>}
                                    </Button>
                                    {uploadedDoc?.url && (
                                        <span className="text-[11px] text-green-300">Uploaded: <a className="underline" href={uploadedDoc.url} target="_blank" rel="noreferrer">view</a></span>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                {(docFile && docPreview) ? (
                                    <div className="flex flex-wrap">
                                        <div className="w-full sm:w-1/2 md:w-1/3 p-1">
                                            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-800 rounded-lg overflow-hidden relative">
                                                <div className="h-32 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                                                    {docPreview && !isPdf(docType) ? (
                                                        <Image
                                                            src={docPreview}
                                                            alt={docFile?.name || 'preview'}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-slate-300 text-xs gap-1">
                                                            <FileText className="h-6 w-6 text-amber-300" />
                                                            <span>PDF file</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 text-xs text-slate-200 space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-semibold truncate" title={docFile?.name}>{docFile?.name || 'Document'}</p>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                                            {isPdf(docType || '') ? 'PDF' : 'Image'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                        {docFile && <span className="text-[10px] text-slate-500">{(docFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full p-4 border border-dashed border-slate-800/80 rounded-lg text-center text-xs text-slate-400 bg-slate-900/40">
                                        No file selected.
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-3">
                                {uploadedDoc?.url ? (
                                    <div className="flex flex-wrap">
                                        <div className="w-full sm:w-1/2 md:w-1/3 p-1">
                                            <div className="bg-gradient-to-tr from-slate-900/60 to-slate-950/60 border border-slate-800 rounded-lg overflow-hidden relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteDialogOpen(true)}
                                                    className="absolute right-2 top-2 z-10 bg-black/60 hover:bg-red-900/60 text-slate-200 hover:text-white rounded-full p-1"
                                                    aria-label="Remove document"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <div className="h-32 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                                                    {!isPdf(uploadedDoc?.type || '') ? (
                                                        <Image
                                                            src={uploadedDoc.url}
                                                            alt={uploadedDoc?.name || 'uploaded'}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-slate-300 text-xs gap-1">
                                                            <FileText className="h-6 w-6 text-amber-300" />
                                                            <span>PDF file</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 text-xs text-slate-200 space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-semibold truncate" title={uploadedDoc?.name}>{uploadedDoc?.name || 'Document'}</p>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                                            {isPdf(uploadedDoc?.type || '') ? 'PDF' : 'Image'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                        {uploadedDoc?.url && <a className="text-cyan-400 hover:text-cyan-300 font-medium" href={uploadedDoc.url} target="_blank" rel="noreferrer">Open</a>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                            <DialogContent className="max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>Remove uploaded file?</DialogTitle>
                                    <DialogDescription>This will delete the file from storage.</DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                                    <Button variant="destructive" onClick={() => { handleRemoveUploadedDoc(); setDeleteDialogOpen(false); }}>Remove</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* SUBMIT */}
                        <div className="pt-2">
                            <div className="rounded-xl border border-cyan-900/40 bg-slate-950/50 px-3 py-3 flex justify-end">
                                <motion.button
                                    type="submit"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isUpdating}
                                    className="min-w-[170px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-700 to-cyan-600 px-4 py-2.5 rounded-lg border border-cyan-500/70 hover:from-cyan-600 hover:to-cyan-500 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_20px_-10px_rgba(34,211,238,0.65)]"
                                >
                                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {isUpdating ? "Updating..." : "Update Enquiry"}
                                </motion.button>
                            </div>
                        </div>

                    </form>
                </Form>

            </div>
        </div>
    );
}

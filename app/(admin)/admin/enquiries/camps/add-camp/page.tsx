"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useGetEqCountries, useGetEqRegions, useGetEqCities, useGetEqAreas, useGetEqProvince, useAddNewEqCamp, useGetEqHeadOfficesFiltered } from "@/query/enquirymanager/queries";
import { EQ_CAMP_VISITED_STATUS_OPTIONS, EQ_CAPACITY_LIMITS, Eq_CAPACITY_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Check, CircleCheckBig, MapPin, Users, Trash2, Loader2 } from "lucide-react";

import CampSolutionsFields from "@/components/enquiries/CampSolutionsFields";
import { EMPTY_CAMP_SOLUTIONS } from "@/lib/enquiries/solutions";
import CampClassificationFields from "@/components/enquiries/CampClassificationFields";
import { CAPACITY_UNITS, OWNERSHIP_OPTIONS, PROJECT_STAGES } from "@/lib/enquiries/project-classification";

export default function AddCampPage() {
    const router = useRouter();
    const [countries, setCountries] = useState([]);
    const [country_id, setCountry] = React.useState("");
    const [region_id, setRegion] = React.useState("");
    const [province_id, setProvince] = React.useState("");
    const [city_id, setCity] = React.useState("");
    const [area_id, setArea] = React.useState("");
    const [head_office_id, setHeadOffice] = React.useState("");
    const [headOfficeOpen, setHeadOfficeOpen] = React.useState(false);
    const [headOfficeSearch, setHeadOfficeSearch] = React.useState("");
    const [headOfficeCandidate, setHeadOfficeCandidate] = React.useState("");
    const [selectedHeadOffice, setSelectedHeadOffice] = React.useState<any>(null);

    const { mutateAsync: GetCountries } = useGetEqCountries();
    const { mutateAsync: AddNewCamp, isPending: isCampAdding } = useAddNewEqCamp();
    const { data: regions } = useGetEqRegions(country_id);
    const { data: provinces } = useGetEqProvince(region_id);
    const { data: cities } = useGetEqCities(province_id);
    const { data: areas } = useGetEqAreas(city_id);
    const { data: headOffices, isLoading: isHeadOfficeLoading } = useGetEqHeadOfficesFiltered({
        search: headOfficeSearch,
        page: 1,
        limit: 200
    });

    type AddCampFormValues = {
        solutions_required: string[];
        solution_other: string;
        solution_details: Record<string, string>;
        primary_solution: string;
        commercial_model: string;
        camp_name: string;
        project_sector: string;
        facility_type: string;
        facility_type_other: string;
        facility_type_detail: string;
        sector_field_values: Record<string, string>;
        hotel_classification: string;
        capacity_unit: string;
        project_stage: string;
        ownership: string;
        visited_status: string;
        camp_capacity: string;
        camp_occupancy: string;
        latitude: string;
        longitude: string;
        landlord: string;
        real_estate: string;
        client_company: string;
    };

    const fetchCountries = useCallback(async () => {
        const res = await GetCountries();
        if (res?.status == 200) {
            setCountries(res?.countries);
        }
    }, [GetCountries]);

    useEffect(() => {
        fetchCountries();
    }, [fetchCountries]);

    useEffect(() => {
        if (headOfficeOpen) {
            setHeadOfficeCandidate(head_office_id);
        }
    }, [headOfficeOpen, head_office_id]);

    const { register, handleSubmit, reset, control, watch, setValue, setError, formState: { errors } } = useForm<AddCampFormValues>({
        defaultValues: {
            ...EMPTY_CAMP_SOLUTIONS,
            camp_name: "",
            project_sector: "",
            facility_type: "",
            facility_type_other: "",
            facility_type_detail: "",
            sector_field_values: {},
            solution_details: {},
            hotel_classification: "",
            capacity_unit: "Beds",
            project_stage: "",
            ownership: "",
            camp_capacity: "",
            camp_occupancy: "",
            visited_status: "To Visit",
            latitude: "",
            longitude: "",
            landlord: "",
            real_estate: "",
            client_company: "",
        }
    });

    const onSubmit = async (data: AddCampFormValues) => {
        const limit = data.camp_capacity === "50000+" ? Infinity : EQ_CAPACITY_LIMITS[data.camp_capacity];
        if (data.camp_occupancy !== "" && limit && Number(data.camp_occupancy) > limit) {
            setError("camp_occupancy", { message: "Occupancy cannot exceed capacity" });
            return;
        }
        try {
            const res = await AddNewCamp({
                ...data,
                camp_name: data.camp_name.trim(),
                camp_occupancy: data.camp_occupancy === "" ? undefined : Number(data.camp_occupancy),
                country_id: country_id || null, region_id: region_id || null,
                province_id: province_id || null, city_id: city_id || null, area_id: area_id || null,
                headoffice_id: head_office_id || null,
            });
            if (res?.status !== 201) {
                setError("root", { message: res?.message || "Unable to save the Facility. Please try again." });
                return;
            }
            toast.success(res.message || "Facility created");
            router.push("/admin/enquiries/camps");
        } catch (error: any) {
            setError("root", { message: error?.response?.data?.message || "Unable to save the Facility. Please try again." });
        }
    };

    const headOfficeList = useMemo(() => headOffices?.head_offices || [], [headOffices?.head_offices]);

    const handleSelectHeadOffice = () => {
        if (!headOfficeCandidate) return;
        const office = headOfficeList.find((item: any) => item._id === headOfficeCandidate);
        setSelectedHeadOffice(office || null);
        setHeadOffice(headOfficeCandidate);
        setHeadOfficeOpen(false);
    };

    const handleRemoveHeadOffice = () => {
        setHeadOffice("");
        setSelectedHeadOffice(null);
        setHeadOfficeCandidate("");
    };

    const inputClass = "border-slate-800 bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-700/40";
    type ScalarField = Exclude<keyof AddCampFormValues, "solutions_required" | "solution_details" | "sector_field_values">;
    const textField = (name: ScalarField, label: string, placeholder: string, type = "text", rules: any = {}) => <div className="space-y-2">
        <label htmlFor={name} className="text-xs font-semibold text-slate-300">{label}</label>
        <Input id={name} type={type} placeholder={placeholder} className={inputClass} aria-invalid={Boolean(errors[name])} {...register(name, rules)} />
        {errors[name] && <p role="alert" className="text-xs text-red-400">{String(errors[name]?.message || "Invalid value")}</p>}
    </div>;
    const optionField = (name: ScalarField, label: string, options: readonly string[]) => <Controller control={control} name={name} render={({ field }) => <div className="space-y-2">
        <label htmlFor={name} className="text-xs font-semibold text-slate-300">{label}</label>
        <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={name} className={inputClass}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
            <SelectContent>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
        </Select>
    </div>} />;
    const locationField = (label: string, value: string, onChange: (value: string) => void, options: any[], key: string, disabled = false) => <div className="space-y-2">
        <label htmlFor={`location-${key}`} className="text-xs font-semibold text-slate-300">{label}</label>
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger id={`location-${key}`} className={inputClass}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
            <SelectContent>{options?.map(item => <SelectItem key={item._id} value={item._id}>{item[key]}</SelectItem>)}</SelectContent>
        </Select>
    </div>;

    return (
        <div className="min-h-screen space-y-6 p-4 pb-10 sm:p-6">
            <Breadcrumb><BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="/admin/enquiries">Enquiries</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbLink href="/admin/enquiries/camps">Manage Facilities</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Add Facility</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList></Breadcrumb>

            <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 p-5 sm:p-6">
                <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70">Enquiry Management</p>
                        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Add a new Facility</h1>
                        <p className="max-w-xl text-sm text-slate-400">Capture the facility, location and company details in one place.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => router.push("/admin/enquiries/camps")}><ArrowLeft size={14} className="mr-2" /> Back to Facilities</Button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <fieldset disabled={isCampAdding} className="grid min-w-0 gap-5 lg:grid-cols-[1.3fr_1fr]">
                    <div className="min-w-0 space-y-5">
                        <FormSection icon={Building2} title="Facility details" description="Identify the facility and choose its sector.">
                            {textField("camp_name", "Facility Name *", "e.g. Al Noor Workforce Village", "text", { validate: (value: string) => Boolean(value.trim()) || "Enter a Facility name" })}
                            <CampClassificationFields control={control} watch={watch} setValue={setValue} />
                            <div className="border-t border-slate-800 pt-5">
                                <CampSolutionsFields control={control} watch={watch} setValue={setValue} />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {optionField("project_stage", "Project Stage", PROJECT_STAGES)}
                                {optionField("ownership", "Ownership", OWNERSHIP_OPTIONS)}
                            </div>
                        </FormSection>
                        <FormSection icon={Users} title="Capacity & visit status" description="Record capacity and current occupancy in the same unit.">
                            <div className="grid gap-4 md:grid-cols-2">
                                {optionField("camp_capacity", "Capacity", Eq_CAPACITY_OPTIONS)}
                                {optionField("capacity_unit", "Capacity Unit", CAPACITY_UNITS)}
                                {textField("camp_occupancy", "Current Occupancy", "e.g. 250", "number", { validate: (value: string) => value === "" || (Number.isInteger(Number(value)) && Number(value) >= 0) || "Enter a non-negative whole number" })}
                                {optionField("visited_status", "Visit Status", EQ_CAMP_VISITED_STATUS_OPTIONS)}
                            </div>
                        </FormSection>
                        <FormSection icon={Building2} title="Company information" description="Add the organisations associated with this facility. All fields are optional.">
                            {textField("landlord", "Landlord", "Landlord name")}
                            <div className="grid gap-4 md:grid-cols-2">
                                {textField("real_estate", "Real Estate Company", "Company name")}
                                {textField("client_company", "Client Company", "Client name")}
                            </div>
                        </FormSection>
                    </div>
                    <div className="min-w-0 space-y-5">
                        <FormSection icon={MapPin} title="Location" description="Choose a country, then refine the location.">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                {locationField("Country", country_id, v => { setCountry(v); setRegion(""); setProvince(""); setCity(""); setArea(""); }, countries, "country_name")}
                                {locationField("Region", region_id, v => { setRegion(v); setProvince(""); setCity(""); setArea(""); }, regions?.region, "region_name", !country_id)}
                                {locationField("Province", province_id, v => { setProvince(v); setCity(""); setArea(""); }, provinces?.provinces, "province_name", !region_id)}
                                {locationField("City", city_id, v => { setCity(v); setArea(""); }, cities?.cities, "city_name", !province_id)}
                                {locationField("Area", area_id, setArea, areas?.areas, "area_name", !city_id)}
                            </div>
                            <div className="space-y-3 border-t border-slate-800 pt-4">
                                <p className="text-xs text-slate-500">Map coordinates (optional)</p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {textField("latitude", "Latitude", "e.g. 24.7136", "text", { validate: (v: string) => !v.trim() || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90) || "Enter a latitude between -90 and 90" })}
                                    {textField("longitude", "Longitude", "e.g. 46.6753", "text", { validate: (v: string) => !v.trim() || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180) || "Enter a longitude between -180 and 180" })}
                                </div>
                            </div>
                        </FormSection>
                        <FormSection icon={Building2} title="Head office" description="Link an existing head office, if applicable.">
                            {selectedHeadOffice ? <div className="flex items-start justify-between gap-3 rounded-xl border border-cyan-900/70 bg-cyan-950/20 p-4">
                                <div className="min-w-0 space-y-1 text-sm text-slate-200">
                                    <p className="font-medium">Linked head office</p>
                                    <p className="break-words text-xs text-slate-400">{selectedHeadOffice.phone || "No phone number"}</p>
                                    <p className="break-words text-xs text-slate-400">{selectedHeadOffice.address || "No address"}</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" aria-label="Remove head office" onClick={handleRemoveHeadOffice}><Trash2 size={14} className="text-red-400" /></Button>
                            </div> : <div className="rounded-xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">No head office linked yet.</div>}
                            <Button type="button" variant="outline" className="w-full" onClick={() => setHeadOfficeOpen(true)}>{selectedHeadOffice ? "Change Head Office" : "Select Head Office"}</Button>
                        </FormSection>
                    </div>
                </fieldset>
                {errors.root && <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/20 p-4 text-sm text-red-300">{errors.root.message}</p>}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 sm:px-6">
                    <p className="text-xs text-slate-500">Fields marked * are required.</p>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" disabled={isCampAdding} onClick={() => router.push("/admin/enquiries/camps")}>Cancel</Button>
                        <Button type="submit" disabled={isCampAdding} className="bg-cyan-700 text-white hover:bg-cyan-600">{isCampAdding ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Check size={16} className="mr-2" />}{isCampAdding ? "Saving..." : "Save Facility"}</Button>
                    </div>
                </div>
            </form>

            <Dialog open={headOfficeOpen} onOpenChange={setHeadOfficeOpen}>
                <DialogContent className="flex max-h-[80vh] flex-col border-slate-800 bg-slate-950 sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Select Head Office</DialogTitle>
                        <DialogDescription>Choose a head office to attach to this Facility.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            aria-label="Search head offices"
                            placeholder="Search by phone or address"
                            value={headOfficeSearch}
                            onChange={(e) => setHeadOfficeSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-y-auto pb-4">
                        {isHeadOfficeLoading && <p className="py-6 text-center text-sm text-slate-400">Loading head offices...</p>}
                        {!isHeadOfficeLoading && headOfficeList.length === 0 && (
                            <div className="w-full h-[10vh] flex items-center justify-center">
                                <h1 className="text-xs font-medium text-slate-400">
                                    {headOfficeSearch ? "No matching head offices" : "No head offices found"}
                                </h1>
                            </div>
                        )}
                        {headOfficeList.map((office: any) => (
                            <motion.button
                                type="button"
                                aria-pressed={office._id === headOfficeCandidate}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                key={office._id}
                                className="w-full text-left p-2 bg-gradient-to-br group from-slate-900/60 to-slate-800/60 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-1 px-4 border border-slate-700 hover:border-cyan-600 justify-start mt-2 relative"
                                onClick={() => setHeadOfficeCandidate(office._id)}
                            >
                                <div className="flex flex-col">
                                    <h1 className="text-xs font-medium">Phone: {office.phone || "N/A"}</h1>
                                    <p className="text-xs text-slate-400">Address: {office.address || "N/A"}</p>
                                </div>
                                {office._id === headOfficeCandidate && (
                                    <div className="absolute top-1 right-2">
                                        <Check className="text-cyan-600" strokeWidth={3} size={18} />
                                    </div>
                                )}
                            </motion.button>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setHeadOfficeOpen(false)}>Cancel</Button>
                        <Button type="button" disabled={!headOfficeCandidate} onClick={handleSelectHeadOffice} className="bg-cyan-700 hover:bg-cyan-600"><CircleCheckBig size={16} className="mr-2" /> Select Head Office</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function FormSection({ icon: Icon, title, description, children }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string; description: string; children: React.ReactNode;
}) {
    return <section className="space-y-5 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
            <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/30 p-2 text-cyan-400"><Icon size={18} /></div>
            <div className="space-y-1"><h2 className="text-sm font-semibold text-slate-100">{title}</h2><p className="text-xs leading-relaxed text-slate-400">{description}</p></div>
        </div>
        {children}
    </section>;
}

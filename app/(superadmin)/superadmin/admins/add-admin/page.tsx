/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/components/ui/breadcrumb"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form"
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"
import { useAddNewBusiness } from "@/query/business/queries"
import { toast } from "sonner"
import { useDispatch } from "react-redux"
import { AppDispatch } from "@/redux/store"
import { loadAdminBusiness } from "@/redux/slices/application"
import LoaderSpin from "@/components/shared/LoaderSpin"
import { Blocks } from "lucide-react"

const formSchema = z.object({
    business_name: z.string().min(2).max(50),
    business_email: z.string().email().max(60),
    business_country: z.string(),
    business_province: z.string(),
    business_city: z.string(),
    business_phone: z.string().min(5),
    business_pin: z.string()
})

const AddAdmin = () => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { mutateAsync: addNewBusiness, isPending: addingBusiness, isSuccess: businessAdded } = useAddNewBusiness();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            business_name: "",
            business_email: "",
            business_country: "",
            business_province: "",
            business_city: "",
            business_phone: "",
            business_pin: ""
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const formData = new FormData();
            formData.append("body", JSON.stringify(values));
            const res = await addNewBusiness(formData);
            if(res.status === 302) {
                toast.error("Business Exists.", {
                    description: "Business With Same Email Already Exists."
                });
                return;
            }
            toast.success("Business Added.", {
                duration: 3000,
                description: "Complete the business details to add admins.",
            });
            dispatch(loadAdminBusiness(res));
            router.push(`/superadmin/admins/add-admin/business`);
        } catch (error) {
            toast.error("Failed to add business", {
                duration: 3000,
                description: 'something went wrong. check server logs.',
            })
        }
    }

    return (
        <div className="p-5 pb-10">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/superadmin/admins">Admins</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>add admin</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="mt-3">
                <h1 className='text-lg font-semibold mb-2 bg-slate-950/50 rounded-lg p-3 flex items-center gap-1'><Blocks size={20} /> Add Business</h1>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 bg-slate-950/50 p-3 rounded-lg pb-10">
                                <FormField
                                    control={form.control}
                                    name="business_name"
                                    render={({ field }) => (
                                        <FormItem className="">
                                            <FormLabel>Business Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="displayed as the company name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="business_email"
                                    render={({ field }) => (
                                        <FormItem className="">
                                            <FormLabel>Business Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="company email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="business_country"
                                    render={({ field }) => (
                                        <FormItem className="">
                                            <FormLabel>Country</FormLabel>
                                            <FormControl>
                                                <Input placeholder="business country" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="business_province"
                                    render={({ field }) => (
                                        <FormItem className="">
                                            <FormLabel>Province</FormLabel>
                                            <FormControl>
                                                <Input placeholder="business province" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="business_city"
                                    render={({ field }) => (
                                        <FormItem className="">
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="located city" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="business_pin"
                                    render={({ field }) => (
                                        <FormItem className="">
                                            <FormLabel>Pin Number</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Pin or Postal code" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="business_phone"
                                    render={({ field }) => (
                                        <FormItem className="">
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="company contact number." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <div className="pt-3 lg:pr-5">
                                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.01 }} className="w-[200px] ml-auto bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg border border-slate-700">
                                    {!addingBusiness ? <Button type="submit" className="w-full bg-trasparent hover:bg-transparent text-slate-200">Save Data</Button> : <div className="flex items-center justify-center w-full"><LoaderSpin size={40} /></div>}
                                </motion.div>
                                </div>
                            </form>
                        </Form>
            </div>
        </div>
    )
}

export default AddAdmin

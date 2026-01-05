/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React from 'react';
import { motion } from 'framer-motion';
import LoaderSpin from '@/components/shared/LoaderSpin';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/redux/store';
import { useGetUserDomainByRole } from '@/query/user/queries';
import { useSession } from 'next-auth/react';
import Cookies from 'js-cookie';
import { loadBusinessData } from '@/redux/slices/userdata';
import { useRouter } from 'next/navigation';
import { resolveSessionUserId } from '@/lib/utils';

const SelectDomainPage = () => {
    const { data: session, status } = useSession();
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const [selectedDomain, setSelectedDomain] = React.useState<string>('');
    const [domains, setDomains] = React.useState<any[]>([]);
    const [businessData, setBusinessData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState<boolean>(false);

    const { mutateAsync: fetchDomains, isPending: domainsLoading } = useGetUserDomainByRole();

    const handleFetchDomains = async () => {
        const roleCookie = Cookies.get('user_role');
        if (!roleCookie) {
            router.replace('/select-roles');
            return;
        }
        let userRole: any = null;
        try {
            userRole = JSON.parse(roleCookie);
        } catch (error) {
            Cookies.remove('user_role');
            router.replace('/select-roles');
            return;
        }

        const roleName = userRole?.role_name;
        if (!roleName) {
            router.replace('/select-roles');
            return;
        }

        const userId = resolveSessionUserId(session);
        if (!userId) {
            router.replace('/signin');
            return;
        }
        const data = await fetchDomains({userid: userId, role: roleName});
        console.log("businessData: ", data);
        setDomains(data?.returnData || []);
        if(roleName == 'BUSINESS_ADMIN') {
            setBusinessData(data?.businesses?.map((business: any) => business?.business_id));
            setDomains(data?.businesses?.map((business: any) => ({ name: business?.business_id?.business_name, value: business?.business_id?._id })));
        } else if (data?.returnData?.length) {
            setBusinessData(data?.returnData?.map((domain: any) => ({
                _id: domain?.business_id,
            })));
        }
    }

    React.useEffect(() => {
        if (status === "loading") return;
        const userId = resolveSessionUserId(session);
        if (!userId) {
            router.replace('/signin');
            return;
        }
        handleFetchDomains();
    }, [session, status]);


    const handleContinueWithDomain = async () => {
        setLoading(true);
        const roleCookie = Cookies.get('user_role');
        if (!roleCookie) {
            setLoading(false);
            router.replace('/select-roles');
            return;
        }

        let userRole: any = null;
        try {
            userRole = JSON.parse(roleCookie);
        } catch (error) {
            setLoading(false);
            Cookies.remove('user_role');
            router.replace('/select-roles');
            return;
        }

        const roleName = userRole?.role_name;
        const selected = domains?.find((domain: any) => domain?.value == selectedDomain);
        if (!selected) {
            setLoading(false);
            return;
        }

        await Cookies.set('user_domain', JSON.stringify(selected));

        const selectedBusiness = businessData?.find((business: any) => business?._id == selectedDomain) || {
            _id: selected?.business_id,
        };
        dispatch(loadBusinessData(selectedBusiness));

        if(roleName == 'BUSINESS_ADMIN') {
            setLoading(false);
            router.push('/admin');
            return;
        }
        setLoading(false);
        router.push('/staff');
    }
    

  return (
    <div className='h-screen w-full p-4 flex items-center justify-center flex-col'>
        <div className='w-full lg:w-1/2 bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-4 rounded-lg'>
            <h1 className='text-2xl font-medium'>Enter to your role</h1>
            <p className='text-sm text-slate-400'>select your organization domain to work with</p>
        </div>
        <div className="flex flex-col w-full lg:w-1/2 bg-gradient-to-tr max-h-[60dvh] overflow-y-scroll from-slate-950/50 to-slate-900/50 rounded-lg p-4 mt-2 space-y-2 items-center justify-center">
        { domains?.length > 0 && domains?.map((domain: any) => (
            <motion.div 
                key={domain?.value}
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedDomain(domain?.value)}
                className={`bg-gradient-to-tr ${selectedDomain == domain?.value ? 'from-cyan-950/50 to-cyan-900/50' : 'from-slate-950/50 to-slate-900/50'} hover:border-cyan-700 border border-transparent select-none cursor-pointer p-4 rounded-lg w-full`}>
                <h1 className='text-md font-semibold'>{domain?.region_name || domain?.area_name || domain?.location_name || domain?.dept_name || domain?.name}</h1>
                {selectedDomain == domain?.value && <p className='text-xs text-slate-400'>selected</p>}
            </motion.div>
        ))}
        </div>
        {selectedDomain && (
            <div>
                <motion.div 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    onClick={handleContinueWithDomain}
                    className='mt-2 bg-gradient-to-tr hover:bg-gradient-to-b from-slate-950 hover:from-cyan-950/50 hover:to-slate-950 to-cyan-950/50 select-none cursor-pointer p-4 rounded-lg w-full'
                >
                    {loading ? <LoaderSpin size={20} /> : <h1 className='text-sm font-medium text-center w-[200px]'>Continue</h1>}
                </motion.div>
            </div>
        )}
    </div>
  )
}

export default SelectDomainPage

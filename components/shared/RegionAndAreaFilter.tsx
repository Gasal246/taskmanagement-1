/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { useGetAllAreas, useGetAllRegions } from '@/query/client/adminQueries';
import { Skeleton } from '../ui/skeleton';

const RegionAndAreaFilter = ({ setArea, setRegion, currentUser, placeholder, getName=false }: { setArea: React.Dispatch<React.SetStateAction<string>>, setRegion: React.Dispatch<React.SetStateAction<string>>, currentUser: any, placeholder?:string, getName?: boolean }) => {
    const [selectedRegion, setSelectedRegion] = useState((currentUser?.Role == 'admin' || currentUser?.Role == 'dep-head') ? 'all' : currentUser?.Region);
    const [selectedArea, setSelectedArea] = useState((currentUser?.Role == 'staff' || currentUser?.Role == 'area-head') ? currentUser?.Area : 'all');
    const { data: adminRegions, isLoading: loadingRegions, refetch: refetchRegions } = useGetAllRegions(currentUser?.Role == 'admin' ? currentUser?._id : currentUser?.Addedby);
    const { data: areas, isLoading: loadingAreas, refetch: refechAreas } = useGetAllAreas(selectedRegion);

    const handleAddSelectedRegion = (regid: string, regName: string) => {
        if (regid == 'all') {
            setSelectedRegion('all');
            setSelectedArea('all');
            setRegion('');
            setArea('');
        }
        setSelectedRegion(regid);
        setRegion(getName ? regName : regid);
        refechAreas();
    }

    const handleAddSelectedArea = (areaid: string, areaName: string) => {
        if (areaid == 'all') {
            setSelectedArea('');
            setArea('');
        }
        setSelectedArea(areaid);
        setArea(getName ? areaName : areaid);
    }

    return (
        <div className='flex items-center gap-1 flex-wrap'>
            {loadingRegions && <Skeleton className='w-[180px] h-[35px] rounded-lg' />}
            {adminRegions?.length > 0 && <Select onValueChange={(value) => handleAddSelectedRegion(value.split('#')[0], value.split('#')[1])}>
                <SelectTrigger className="w-[180px] border border-slate-300">
                    <SelectValue placeholder={placeholder || 'All'} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all' className='capitalize' >All Region</SelectItem>
                    {adminRegions?.map((region: any) => (
                        <SelectItem key={region?._id} value={region?._id+'#'+region?.RegionName} >{region?.RegionName}</SelectItem>
                    ))}
                </SelectContent>
            </Select>}
            {loadingAreas && <Skeleton className='w-[180px] h-[35px] rounded-lg' />}
            {
                areas?.length > 0 && selectedRegion != 'all' && (
                    <Select onValueChange={(value) => handleAddSelectedArea(value.split('#')[0], value.split('#')[1])}>
                        <SelectTrigger className="w-[180px] border border-slate-300">
                            <SelectValue placeholder="All Areas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='all' >All Areas</SelectItem>
                            {
                                areas?.map((area: any) => (
                                    <SelectItem key={area?._id} value={area?._id+'#'+area?.Areaname}>{area?.Areaname}</SelectItem>
                                ))
                            }
                        </SelectContent>
                    </Select>
                )
            }
        </div>
    )
}

export default RegionAndAreaFilter
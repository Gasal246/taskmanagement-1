import React, { useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, } from "@/components/ui/sheet"
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { motion } from 'framer-motion';
import { loadStaffFilterValues } from '@/redux/slices/application';
import { useGetAreaLocations, useGetBusinessRegions, useGetBusinessSkills, useGetRegionAreas } from '@/query/business/queries';

const FilterStaffsSheet = ({ trigger }: { trigger: React.ReactNode }) => {
    const dispatch = useDispatch();
    const { staffFilterValues } = useSelector((state: RootState) => state.application);
    const { businessData } = useSelector((state: RootState) => state.user);

    // State for lists
    const [regionList, setRegionList] = React.useState<any[]>([]);
    const [areaList, setAreaList] = React.useState<any[]>([]);
    const [locationList, setLocationList] = React.useState<any[]>([]);
    const [skillList, setSkillList] = React.useState<any[]>([]);

    // Mutation hooks
    const { mutateAsync: getBusinessSkills } = useGetBusinessSkills();
    const { mutateAsync: getBusinessRegions } = useGetBusinessRegions();
    const { mutateAsync: getRegionAreas } = useGetRegionAreas();
    const { mutateAsync: getAreaLocations } = useGetAreaLocations();

    // State for selections
    const [region, setRegion] = React.useState('');
    const [regionName, setRegionName] = React.useState('');
    const [area, setArea] = React.useState('');
    const [areaName, setAreaName] = React.useState('');
    const [location, setLocation] = React.useState('');
    const [locationName, setLocationName] = React.useState('');
    const [skill, setSkill] = React.useState('');
    const [skillName, setSkillName] = React.useState('');

    // Fetch initial data (regions and skills) when component mounts
    useEffect(() => {
        const fetchInitialData = async () => {
            const regions = await getBusinessRegions({business_id: businessData?._id});
            console.log(regions?.data);
            setRegionList(regions?.data || []);
            const skills = await getBusinessSkills(businessData?._id);
            setSkillList(skills?.data || []);
        };
        fetchInitialData();
    }, [businessData?._id, getBusinessRegions, getBusinessSkills]);

    // Populate states from staffFilterValues
    useEffect(() => {
        if (staffFilterValues) {
            setRegion(staffFilterValues.region || '');
            setRegionName(staffFilterValues.regionName || '');
            setArea(staffFilterValues.area || '');
            setAreaName(staffFilterValues.areaName || '');
            setLocation(staffFilterValues.location || '');
            setLocationName(staffFilterValues.locationName || '');
            setSkill(staffFilterValues.skill || '');
            setSkillName(staffFilterValues.skillName || '');
        }
    }, [staffFilterValues]);

    // Handle select changes
    const handleSelect = async (type: 'region' | 'area' | 'location' | 'skill', value: string) => {
        switch (type) {
            case 'region':
                const selectedRegion = regionList.find((r) => r?._id === value);
                if (selectedRegion) {
                    setRegion(value);
                    setRegionName(selectedRegion?.region_name);
                    setArea('');
                    setAreaName('');
                    setLocation('');
                    setLocationName('');
                    if(value !== 'all') {
                        const fetchAreas = async () => {
                            const areas = await getRegionAreas({ region_ids: [value] });
                            setAreaList(areas?.data || []);
                        };
                        fetchAreas();
                    }
                }
                break;
            case 'area':
                const selectedArea = areaList.find((a) => a?._id === value);
                if (selectedArea) {
                    setArea(value);
                    setAreaName(selectedArea?.area_name);
                    setLocation('');
                    setLocationName('');
                    if(value !== 'all') {
                        const fetchLocations = async () => {
                            const locations = await getAreaLocations({ area_ids: [value] });
                            setLocationList(locations?.data || []);
                        };
                        fetchLocations();
                    }
                }
                break;
            case 'location':
                const selectedLocation = locationList.find((l) => l?._id === value);
                if (selectedLocation) {
                    setLocation(value);
                    setLocationName(selectedLocation?.location_name);
                }
                break;
            case 'skill':
                const selectedSkill = skillList.find((s) => s?._id === value);
                if (selectedSkill) {
                    setSkill(value);
                    setSkillName(selectedSkill?.skill_name);
                }
                break;
            default:
                break;
        }
    };

    // Apply filter
    const applyFilter = () => {
        const filterValues = {
            region: region || null,
            regionName: regionName || null,
            area: area || null,
            areaName: areaName || null,
            location: location || null,
            locationName: locationName || null,
            skill: skill || null,
            skillName: skillName || null,
        };
        dispatch(loadStaffFilterValues(filterValues));
    };

    // Reset filter
    const resetFilter = () => {
        setRegion('');
        setRegionName('');
        setArea('');
        setAreaName('');
        setLocation('');
        setLocationName('');
        setSkill('');
        setSkillName('');
        dispatch(
            loadStaffFilterValues({
                region: null,
                regionName: null,
                area: null,
                areaName: null,
                location: null,
                locationName: null,
                skill: null,
                skillName: null,
            })
        );
    };

    return (
        <Sheet>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent className='min-w-full lg:min-w-[600px] border-cyan-900 px-2'>
                <SheetHeader className='p-2'>
                    <SheetTitle>
                        <div>
                            <h1 className='font-medium text-xl text-slate-300'>Filter Staffs</h1>
                            <h1 className='font-medium text-sm text-slate-400 flex items-center gap-1'>Apply filter to fetch the results.</h1>
                        </div>
                    </SheetTitle>
                </SheetHeader>
                <div className='p-2'>
                    <div className='flex items-center gap-2 flex-wrap mb-5'>
                        {regionName && <div className='border border-slate-800 p-2 rounded-lg min-w-[200px]'>
                            <h1 className='font-medium text-xs text-slate-400'>Region</h1>
                            <h1 className='font-medium text-sm text-slate-300'>{regionName}</h1>
                        </div>}
                        {areaName && <div className='border border-slate-800 p-2 rounded-lg min-w-[200px]'>
                            <h1 className='font-medium text-xs text-slate-400'>Area</h1>
                            <h1 className='font-medium text-sm text-slate-300'>{areaName}</h1>
                        </div>}
                        {locationName && <div className='border border-slate-800 p-2 rounded-lg min-w-[200px]'>
                            <h1 className='font-medium text-xs text-slate-400'>Location</h1>
                            <h1 className='font-medium text-sm text-slate-300'>{locationName}</h1>
                        </div>}
                        {skillName && <div className='border border-slate-800 p-2 rounded-lg min-w-[200px]'>
                            <h1 className='font-medium text-xs text-slate-400'>Skill</h1>
                            <h1 className='font-medium text-sm text-slate-300'>{skillName}</h1>
                        </div>}
                    </div>
                    <div className="">
                        <div className='border border-dashed border-slate-800 p-2 rounded-lg min-w-[200px] mb-2'>
                            <h1 className='font-medium text-xs text-slate-400 mb-1'>Select Region</h1>
                            <Select onValueChange={(value) => handleSelect('region', value)}>
                                <SelectTrigger className='border border-slate-800 p-2 rounded-lg min-w-[200px] text-slate-300 placeholder:text-slate-400 text-xs'>
                                    <SelectValue placeholder="Select Region" className="" />
                                </SelectTrigger>
                                <SelectContent className='border border-slate-800 bg-black/50 backdrop-blur-sm'>
                                    <SelectItem value="all" className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>All</SelectItem>
                                    {regionList.map((region) => (
                                        <SelectItem key={region?._id} value={region?._id} className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>{region?.region_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='border border-dashed border-slate-800 p-2 rounded-lg min-w-[200px] mb-2'>
                            <h1 className='font-medium text-xs text-slate-400 mb-1'>Select Area</h1>
                            <Select onValueChange={(value) => handleSelect('area', value)}>
                                <SelectTrigger className='border border-slate-800 p-2 rounded-lg min-w-[200px] text-slate-300 placeholder:text-slate-400 text-xs'>
                                    <SelectValue placeholder="Select Area" className="" />
                                </SelectTrigger>
                                <SelectContent className='border border-slate-800 bg-black/50 backdrop-blur-sm'>
                                    <SelectItem value="all" className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>All</SelectItem>
                                    {areaList.map((area) => (
                                        <SelectItem key={area?._id} value={area?._id} className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>{area?.area_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='border border-dashed border-slate-800 p-2 rounded-lg min-w-[200px] mb-2'>
                            <h1 className='font-medium text-xs text-slate-400 mb-1'>Select Location</h1>
                            <Select onValueChange={(value) => handleSelect('location', value)}>
                                <SelectTrigger className='border border-slate-800 p-2 rounded-lg min-w-[200px] text-slate-300 placeholder:text-slate-400 text-xs'>
                                    <SelectValue placeholder="Select Location" className="" />
                                </SelectTrigger>
                                <SelectContent className='border border-slate-800 bg-black/50 backdrop-blur-sm'>
                                    <SelectItem value="all" className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>All</SelectItem>
                                    {locationList.map((location) => (
                                        <SelectItem key={location?._id} value={location?._id} className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>{location?.location_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='border border-dashed border-slate-800 p-2 rounded-lg min-w-[200px] mb-2'>
                            <h1 className='font-medium text-xs text-slate-400 mb-1'>Select Skills</h1>
                            <Select onValueChange={(value) => handleSelect('skill', value)}>
                                <SelectTrigger className='border border-slate-800 p-2 rounded-lg min-w-[200px] text-slate-300 placeholder:text-slate-400 text-xs'>
                                    <SelectValue placeholder="Select Skills" className="" />
                                </SelectTrigger>
                                <SelectContent className='border border-slate-800 bg-black/50 backdrop-blur-sm'>
                                    <SelectItem value="all" className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>All</SelectItem>
                                    {skillList.map((skill) => (
                                        <SelectItem key={skill?._id} value={skill?._id} className='hover:bg-slate-900 text-xs font-medium cursor-pointer'>{skill?.skill_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-5 px-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className='bg-gradient-to-br from-slate-900 to-slate-800 text-slate-300 p-2 rounded-lg text-sm font-medium px-10 w-[49.5%] text-center cursor-pointer hover:opacity-90 border border-transparent hover:border-cyan-800 hover:text-cyan-500'
                        onClick={applyFilter}
                    >
                        Apply Filter
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className='bg-gradient-to-br from-red-950/80 to-red-900/80 text-slate-300 p-2 rounded-lg text-sm font-medium px-10 w-[49.5%] text-center cursor-pointer hover:opacity-90 border border-transparent hover:border-cyan-800 hover:text-slate-300'
                        onClick={resetFilter}
                    >
                        Reset Filter
                    </motion.div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

export default FilterStaffsSheet
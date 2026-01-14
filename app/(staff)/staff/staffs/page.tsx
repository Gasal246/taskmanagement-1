"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, MousePointerClick, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGetAllStaffsForStaff, useGetBusinessSkills } from '@/query/business/queries';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Avatar } from 'antd';
import { HEAD_ROLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import LoaderSpin from '@/components/shared/LoaderSpin';

const formatLastLogin = (lastLogin?: string | null, lastLogout?: string | null) => {
  if (!lastLogin) {
    return { label: "Not yet", subLabel: "-" };
  }

  const loginDate = new Date(lastLogin);
  const logoutDate = lastLogout ? new Date(lastLogout) : null;

  const formatDay = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatTime = (date: Date) => {
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = `${date.getMinutes()}`.padStart(2, "0");
    const suffix = hours24 >= 12 ? "pm" : "am";
    return `${hours12}.${minutes}${suffix}`;
  };

  const formatDuration = (start: Date, end: Date) => {
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins || 1} minute${diffMins === 1 ? "" : "s"}`;
    }
    const diffHours = Math.round(diffMins / 60);
    return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  };

  const dayLabel = formatDay(loginDate);
  const loginTime = formatTime(loginDate);
  const logoutTime = logoutDate ? formatTime(logoutDate) : null;
  const durationLabel = logoutDate ? formatDuration(loginDate, logoutDate) : "-";

  return {
    label: `${dayLabel}, ${loginTime}${logoutTime ? ` to ${logoutTime}` : ""}`,
    subLabel: durationLabel,
  };
};

const resolveDomainId = (roleName: string, domainData: any) => {
  switch (roleName) {
    case "REGION_HEAD":
    case "REGION_STAFF":
      return domainData?.region_id;
    case "AREA_HEAD":
    case "AREA_STAFF":
      return domainData?.area_id;
    case "LOCATION_HEAD":
    case "LOCATION_STAFF":
      return domainData?.location_id;
    case "REGION_DEP_HEAD":
    case "REGION_DEP_STAFF":
    case "AREA_DEP_HEAD":
    case "AREA_DEP_STAFF":
    case "LOCATION_DEP_HEAD":
    case "LOCATION_DEP_STAFF":
      return domainData?.department_id;
    default:
      return domainData?.value;
  }
};

const StaffList = () => {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [roleLabel, setRoleLabel] = useState("");
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [skills, setSkills] = useState<any[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [appliedSkillIds, setAppliedSkillIds] = useState<string[]>([]);
  const limit = 15;
  const { mutateAsync: GetStaffs, isPending } = useGetAllStaffsForStaff();
  const { mutateAsync: getBusinessSkills } = useGetBusinessSkills();

  const fetchStaffs = async () => {
    const cookieData = Cookies.get("user_role");
    const domainCookie = Cookies.get("user_domain");
    if (!cookieData || !domainCookie) {
      toast.error("Cookie not found");
      return;
    }

    try {
      const jsonData = JSON.parse(cookieData);
      const domainData = JSON.parse(domainCookie);
      const roleName = jsonData?.role_name || "";

      if (!HEAD_ROLES.includes(roleName)) {
        setAccessMessage("Your role does not have staff access.");
        return;
      }

      setAccessMessage(null);
      setRoleLabel(roleName);
      setBusinessId(domainData?.business_id || "");
      const domainId = resolveDomainId(roleName, domainData);
      if (!domainId) {
        toast.error("Domain not found");
        return;
      }

      const res = await GetStaffs({ role_id: jsonData?._id, domain_id: domainId });
      if (res?.status === 200) {
        setUsers(res?.data || []);
      } else {
        toast.error(res?.message || "Failed to fetch staff data");
      }
    } catch (error) {
      toast.error("An error occurred while fetching staff data");
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  useEffect(() => {
    if (!businessId) return;
    const loadSkills = async () => {
      const response = await getBusinessSkills(businessId);
      if (response?.status === 200) {
        setSkills(response?.data || []);
      }
    };
    loadSkills();
  }, [businessId, getBusinessSkills]);

  useEffect(() => {
    const nextValue = searchValue.trim();
    const timeout = setTimeout(() => setSearchQuery(nextValue), 350);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const normalizedSearch = searchQuery.toLowerCase();
  const filteredUsers = useMemo(() => {
    let visible = users;

    if (normalizedSearch) {
      visible = visible.filter((staff: any) => {
        const skillNames = (staff?.skills || [])
          .map((skill: any) => skill?.skill_id?.skill_name)
          .filter(Boolean)
          .join(" ");

        const searchable = [
          staff?.name,
          staff?.email,
          staff?.phone,
          skillNames,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(normalizedSearch);
      });
    }

    if (appliedSkillIds.length > 0) {
      const selectedSet = new Set(appliedSkillIds);
      visible = visible.filter((staff: any) =>
        (staff?.skills || []).some((skill: any) => {
          const skillId = skill?.skill_id?._id || skill?.skill_id;
          return skillId && selectedSet.has(skillId.toString());
        })
      );
    }

    return visible;
  }, [users, normalizedSearch, appliedSkillIds]);

  const filteredSkills = useMemo(() => {
    const term = skillSearch.trim().toLowerCase();
    if (!term) return skills;
    return skills.filter((skill: any) =>
      (skill?.skill_name || "").toLowerCase().includes(term)
    );
  }, [skills, skillSearch]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, users.length, appliedSkillIds]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / limit));
  const pagedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 10) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const tailSize = 5;
    const mainSize = 5;
    const tailStart = Math.max(totalPages - tailSize + 1, 1);
    let mainStart = page <= 5 ? 1 : page + 1;

    if (mainStart >= tailStart) {
      mainStart = tailStart;
    }
    let mainEnd = Math.min(mainStart + mainSize - 1, totalPages);
    if (mainEnd >= tailStart - 1) {
      mainEnd = tailStart - 1;
    }

    const items: Array<number | "ellipsis"> = [];
    for (let i = mainStart; i <= mainEnd; i += 1) {
      items.push(i);
    }
    if (mainEnd > 0 && mainEnd < tailStart - 1) {
      items.push("ellipsis");
    }
    for (let i = tailStart; i <= totalPages; i += 1) {
      items.push(i);
    }
    return items;
  }, [totalPages, page]);

  const startIndex = filteredUsers.length === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, filteredUsers.length);
  const hasSearch = Boolean(searchQuery.trim()) || appliedSkillIds.length > 0;

  const formattedRole = roleLabel ? roleLabel.replace(/_/g, " ") : "";

  return (
    <div className="p-3 sm:p-5 overflow-y-auto">
      <div className="bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 rounded-lg mb-3 border border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-400">Staffs Under Your Department</p>
            <h1 className="font-semibold text-base text-slate-200 flex items-center gap-2">
              <Users size={16} /> Staff List
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              Click on the staffs to preview in detail. <MousePointerClick size={16} className="inline" />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] px-3 py-1 rounded-full border border-slate-800 text-slate-400">
              {users.length} staff members
            </span>
            {formattedRole && (
              <span className="text-[10px] px-3 py-1 rounded-full border border-slate-800 text-slate-400 uppercase">
                {formattedRole}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by name, email, phone, or skill"
              className="pl-9 border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="border-slate-700 text-xs text-slate-200 hover:bg-slate-900"
              >
                <Filter size={14} className="mr-2" />
                Filter Skills
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-gradient-to-tr from-slate-950/95 to-slate-900/95 border-slate-800">
              <SheetHeader>
                <SheetTitle className="text-slate-200">Skill Filter</SheetTitle>
                <SheetDescription className="text-slate-400">
                  Select skills to show staff members who match any of them.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[11px] text-slate-500 uppercase mb-2">Search skills</p>
                  <Input
                    placeholder="Search skills..."
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    className="border-slate-700 focus:border-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 uppercase mb-2">Selected skills</p>
                  {selectedSkillIds.length === 0 && (
                    <p className="text-xs text-slate-400">No skills selected.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {selectedSkillIds.map((skillId) => {
                      const skill = skills.find((item: any) => item?._id === skillId);
                      return (
                        <button
                          key={skillId}
                          type="button"
                          onClick={() =>
                            setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId))
                          }
                          className="text-[10px] px-2 py-1 rounded-full border border-slate-700 text-slate-200 hover:border-rose-500/60 hover:text-rose-300"
                        >
                          {skill?.skill_name || "Skill"} ×
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-500 uppercase mb-2">All skills</p>
                  <div className="h-[320px] pr-2 overflow-y-auto space-y-2">
                    {filteredSkills.length === 0 && (
                      <p className="text-xs text-slate-400">No skills found.</p>
                    )}
                    {filteredSkills.map((skill: any) => {
                      const isSelected = selectedSkillIds.includes(skill?._id);
                      return (
                        <button
                          key={skill?._id}
                          type="button"
                          onClick={() => {
                            setSelectedSkillIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== skill?._id)
                                : [...prev, skill?._id]
                            );
                          }}
                          className={`w-full text-left text-xs px-3 py-2 rounded-lg border ${
                            isSelected
                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          {skill?.skill_name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                  <Button
                    variant="ghost"
                    className="text-xs text-slate-400 hover:text-slate-200"
                    onClick={() => {
                      setSelectedSkillIds([]);
                      setAppliedSkillIds([]);
                    }}
                  >
                    Clear all
                  </Button>
                  <Button
                    className="text-xs bg-cyan-600 hover:bg-cyan-500 text-slate-950"
                    onClick={() => setAppliedSkillIds(selectedSkillIds)}
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="text-[11px] text-slate-400">
            {filteredUsers.length} matches
          </div>
        </div>
      </div>

      {accessMessage && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 text-sm text-slate-300">
          {accessMessage}
        </div>
      )}

      {!accessMessage && (
        <div className="space-y-3">
          {isPending && (
            <p className="text-slate-300 text-center flex flex-wrap items-center justify-center gap-2 mt-10">
              <LoaderSpin size={45} title="" />
              <i>Loading Staffs...</i>
            </p>
          )}

          {!isPending && filteredUsers.length === 0 && (
            <p className="text-slate-300 text-center">
              {hasSearch ? "No matching staff found." : "No staff data available."}
            </p>
          )}

          {!isPending && pagedUsers.length > 0 && (
            <>
              {pagedUsers.map((staff: any, index: number) => {
                const skillNames = (staff?.skills || [])
                  .map((skill: any) => skill?.skill_id?.skill_name)
                  .filter(Boolean);
                const { label, subLabel } = formatLastLogin(
                  staff?.last_login,
                  staff?.last_logout
                );

                return (
                  <motion.div
                    key={staff?._id || index}
                    className="group border border-slate-800 rounded-xl bg-gradient-to-tr from-slate-950/60 to-slate-900/60 p-4 hover:border-cyan-700 transition-colors cursor-pointer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => router.push(`staffs/${staff?._id}?role_id=${staff?.role}`)}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <Avatar size={52} src={staff?.avatar_url || "/avatar.png"} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold text-slate-200">
                              {staff?.name || "Unnamed"}
                            </h2>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-400 uppercase">
                              {staff?.role?.replace(/_/g, " ") || "STAFF"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{staff?.email || "No email"}</p>
                          {staff?.phone && (
                            <p className="text-[11px] text-slate-500">{staff?.phone}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 grid gap-3 md:grid-cols-2">
                        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">Last login</p>
                            <p className="text-xs text-slate-300 mt-2">{label}</p>
                            <p className="text-[10px] text-slate-500">{subLabel}</p>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full border ${
                              staff?.status === 1
                                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                : "border-rose-500/40 text-rose-300 bg-rose-500/10"
                            }`}
                          >
                            {staff?.status === 1 ? "Active" : "Blocked"}
                          </span>
                        </div>

                        <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500 uppercase">Skills</p>
                          {skillNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {skillNames.slice(0, 3).map((skill: string) => (
                                <span
                                  key={skill}
                                  className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-300"
                                >
                                  {skill}
                                </span>
                              ))}
                              {skillNames.length > 3 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-400">
                                  +{skillNames.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 mt-2">No skills added</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {totalPages > 1 && (
                <div className="flex flex-col gap-2 mt-4 text-xs text-slate-400">
                  <p>
                    Showing {startIndex}-{endIndex} of {filteredUsers.length} staff members
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setPage((prev) => Math.max(prev - 1, 1));
                          }}
                          className={page === 1 ? "pointer-events-none opacity-40" : ""}
                        />
                      </PaginationItem>
                      {pageItems.map((item, pageIndex) => (
                        <PaginationItem key={`${item}-${pageIndex}`}>
                          {item === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              isActive={item === page}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setPage((prev) => Math.min(prev + 1, totalPages));
                          }}
                          className={page === totalPages ? "pointer-events-none opacity-40" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffList;

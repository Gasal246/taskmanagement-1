import { enquiryActor, canAdministerEnquiry } from "@/lib/enquiries/access";
import Enquiries from "@/models/eq_enquiries.model";
import Tasks from "@/models/business_tasks.model";
import Projects from "@/models/business_project.model";
import mongoose from "mongoose";
export async function notificationTarget(item: any) {
  const data = { ...item.meta, ...item.data }; const actor = await enquiryActor();
  if (!actor) return null;
  const valid = (value: any) => typeof value === "string" && mongoose.isValidObjectId(value);
  if (valid(data.taskId)) {
    const task: any = await Tasks.findById(data.taskId).select("business_id").lean();
    const path = canAdministerEnquiry(task || {}, actor) ? "/admin/tasks/" : "/staff/tasks/";
    const params = new URLSearchParams();
    if (valid(data.activityId)) params.set("activityId", data.activityId);
    if (valid(data.commentId)) { params.set("comments", "open"); params.set("commentId", data.commentId); }
    else if (String(data.linkSuffix || "").includes("comments=open")) params.set("comments", "open");
    return `${path}${data.taskId}${params.size ? `?${params}` : ""}`;
  }
  if (valid(data.enquiryId)) {
    const enquiry: any = await Enquiries.findById(data.enquiryId).select("business_id").lean();
    return `${canAdministerEnquiry(enquiry || {}, actor) ? "/admin/enquiries/" : "/staff/enquiry/"}${data.enquiryId}`;
  }
  if (data.type === "head-office-request") return actor.admin ? "/admin/enquiries/camps/head-offices" : "/staff/enquiry/head-quaters";
  if (valid(data.projectId)) {
    const project: any = await Projects.findById(data.projectId).select("business_id").lean();
    return `${canAdministerEnquiry(project || {}, actor) ? "/admin/projects/" : "/staff/projects/"}${data.projectId}`;
  }
  if (data.type === "calendar") return `${actor.admin ? "/admin" : "/staff"}/calendar${valid(data.eventId) ? `?eventId=${data.eventId}${Number.isFinite(Date.parse(data.eventStart)) ? `&date=${encodeURIComponent(data.eventStart)}` : ""}` : ""}`;
  const link = data.link || data.url;
  return typeof link === "string" && /^\/(?!\/)/.test(link) && !link.includes("\\") && link !== "/notifications" && !link.startsWith("/notifications/") ? link : null;
}

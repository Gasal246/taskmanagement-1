"use client";
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useGetEnquiryByIdForStaffs } from '@/query/enquirymanager/queries';
import EnquiryCompletionActions from '@/components/enquiries/EnquiryCompletionActions';
import EnquiryActionProgress from '@/components/enquiries/EnquiryActionProgress';
import { idOf } from '@/lib/enquiries/completion';
export default function StaffEnquiryActionPage() {
  const { enquiry_id } = useParams<{ enquiry_id: string }>();
  const router = useRouter();
  const { data, isLoading } = useGetEnquiryByIdForStaffs(enquiry_id);
  if (isLoading) return <p className="p-6 text-slate-300">Loading your actions…</p>;
  if (!data?.enquiry) return <p role="alert" className="p-6 text-slate-300">{data?.message || 'Enquiry not available'}</p>;
  const enquiry = data.enquiry;
  const assigned = enquiry.actions.filter((a: any) => a.action_assignments.some((p: any) => idOf(p.user_id) === enquiry.current_actor_id));
  return <div className="space-y-4 p-6 pb-24 text-slate-100"><Button variant="ghost" onClick={() => router.back()}>Back to enquiry</Button><h1 className="text-xl font-semibold">Your enquiry actions</h1><p className="text-sm text-slate-400">Older assignments remain here when another follow-up is scheduled.</p><EnquiryCompletionActions enquiry={enquiry} basePath="/staff/enquiry" />{!assigned.length && <p>No actions are assigned to you.</p>}{assigned.map((action: any) => <article key={idOf(action)} className="rounded-xl border border-slate-700 p-4"><h2 className="mb-3 font-medium">{action.action}</h2><EnquiryActionProgress action={action} /></article>)}</div>;
}

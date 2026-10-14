import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SessionProvider } from "next-auth/react";
import ActivityDetailsSheet from "@/components/task/ActivityDetailsSheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
const person = { _id: 'viewer', name: 'Alex Morgan', email: 'alex@example.invalid' };
const initial = {
  _id: 'activity', activity: 'Inspect the network installation and confirm readiness',
  description: 'Check cabling, equipment, and connectivity.\nRecord any findings before completing the activity.\n'.repeat(12),
  start_date: '2026-10-15T08:00:00Z', end_date: '2026-10-16T16:00:00Z', is_done: false,
  created_by: { _id: 'creator', name: 'Original Creator' },
  assignees: [person, { _id: 'other', name: 'Jordan Lee', email: 'jordan@example.invalid' }],
  reassignment_history: [{ action: 'assigned', actor_id: { _id: 'head', name: 'Sam Taylor' }, recipient_id: person, createdAt: '2026-10-14T10:00:00Z' }],
  documents: [{ storagePath: 'document', name: 'Installation plan.pdf', extension: 'pdf', mimeType: 'application/pdf', url: '', size: 400 }],
};
function Fixture() {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState(initial);
  return <><button id="view-activity" onClick={() => setOpen(true)}>View activity</button>
    <ActivityDetailsSheet activity={open ? activity : null} taskId="task" currentUserId="viewer" onClose={() => setOpen(false)} actions={<div className="flex flex-wrap gap-2">
      <Dialog><DialogTrigger asChild><Button variant="outline">History</Button></DialogTrigger><DialogContent><DialogTitle>Activity history</DialogTitle><DialogDescription>Assignment history and changes.</DialogDescription></DialogContent></Dialog>
      <Button variant="outline">Assign more</Button><Button variant="outline">Edit</Button><Button variant="outline">Delete</Button>
      <Button id="complete" onClick={() => setActivity({ ...activity, is_done: !activity.is_done })}>{activity.is_done ? 'Reopen activity' : 'Mark Completed'}</Button>
    </div>} />
  </>;
}
createRoot(document.getElementById('root')!).render(<SessionProvider session={{ user: { id: 'viewer' }, expires: '2099-01-01T00:00:00Z' }}><Fixture /></SessionProvider>);

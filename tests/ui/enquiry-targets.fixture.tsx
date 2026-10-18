import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import axios from 'axios';
import EnquiryTargets from '@/components/enquiries/EnquiryTargets';
import { createQueryClient } from '@/query/create-query-client';
import { currentTargetMonth } from '@/lib/enquiries/targets';
import { EMPTY_ENQUIRY_CATALOGUE } from '@/lib/enquiries/catalogue';
const business = '111111111111111111111111', country = '222222222222222222222222', region = '333333333333333333333333', person = '444444444444444444444444', colleague = '444444444444444444444445';
const users = [{ _id: person, name: 'Staff One', email: 'one@example.test' }, { _id: colleague, name: 'Staff Two', email: 'two@example.test' }];
const enquiries = [1, 2, 3].map(i => ({ _id: `55555555555555555555555${i}`, enquiry_uuid: `ENQ-${i}`, camp_id: { camp_name: `Test Facility ${i}` }, is_active: true, actions: [], createdByName: 'Creator' }));
const state = (window as any).targetChecks = {
  requests: [] as any[], saved: [] as any[], errors: [] as string[], fail: false,
  targets: [{ _id: '666666666666666666666666', business_id: business, month: currentTargetMonth(), week: 1, enquiry_ids: enquiries.slice(0, 2).map(e => e._id), assigned_user_ids: [person], enquiry_notes: { [enquiries[0]._id]: 'Contact reception before visiting.\nConfirm the meeting time.' }, createdAt: '2026-10-13T09:00:00Z' }] as any[],
};
window.addEventListener('error', e => state.errors.push(e.message));
axios.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { catalogue: EMPTY_ENQUIRY_CATALOGUE } });
window.fetch = async (url, init) => {
  const parsed = new URL(String(url), location.origin), p = parsed.searchParams;
  const path = parsed.pathname.replace('/api/enquiries/targets', '');
  const method = init?.method || 'GET';
  state.requests.push({ path, method, params: Object.fromEntries(p) });
  if (state.fail && path === '') return Response.json({ message: 'Test connection unavailable' }, { status: 503 });
  if (path === '/options') return Response.json({ businesses: [{ _id: business, business_name: 'Test business' }], countries: [{ _id: country, country_name: 'UAE' }], regions: [{ _id: region, country_id: country, region_name: 'Dubai' }], users });
  if (path === '/candidates') return Response.json({ data: p.get('search') || p.get('page') === '2' ? enquiries.slice(2) : enquiries.slice(0, 2), pagination: { totalPages: 2, totalRecords: 3 } });
  if (path === '/overlaps') return Response.json({ overlaps: [{ month: currentTargetMonth(), week: null }] });
  const target = state.targets.find((t: any) => `/${t._id}` === path);
  if (method === 'POST' && path === '') {
    const body = JSON.parse(String(init?.body)); state.saved.push(body);
    const created = { ...body, _id: `66666666666666666666666${state.targets.length + 6}`, enquiry_ids: [], assigned_user_ids: [], enquiry_notes: {}, createdAt: new Date().toISOString() };
    state.targets.push(created); return Response.json({ target: created });
  }
  if (method === 'PATCH') {
    const body = JSON.parse(String(init?.body)); state.saved.push(body);
    if (body.operation === 'period') { target.month = body.month; target.week = body.week; }
    if (body.operation === 'add_enquiries') { target.enquiry_ids.push(...body.enquiry_ids); for (const id of body.enquiry_ids) target.enquiry_notes[id] = body.note; }
    if (body.operation === 'edit_note') target.enquiry_notes[body.enquiry_id] = body.note.trim();
    if (body.operation === 'remove_enquiry') { target.enquiry_ids = target.enquiry_ids.filter((id: string) => id !== body.enquiry_id); delete target.enquiry_notes[body.enquiry_id]; }
    if (body.operation === 'add_members') target.assigned_user_ids = [...new Set([...target.assigned_user_ids, ...body.user_ids])];
    if (body.operation === 'remove_member') target.assigned_user_ids = target.assigned_user_ids.filter((id: string) => id !== body.user_id);
    return Response.json({ target });
  }
  if (method === 'DELETE') { state.targets = state.targets.filter((t: any) => t !== target); return Response.json({ message: 'Deleted' }); }
  if (target) return Response.json({ target });
  const rows = state.targets.filter((t: any) => p.get('view') !== 'staff' || t.assigned_user_ids.includes(person)).map((t: any) => {
    const entries = enquiries.filter(e => t.enquiry_ids.includes(e._id)).map(e => ({ ...e, target_note: t.enquiry_notes[e._id] || '' }));
    return { ...t, members: users.filter(u => t.assigned_user_ids.includes(u._id)), enquiry_count: t.enquiry_ids.length, enquiries: entries, enquiryPagination: { totalRecords: entries.length, totalPages: 1, page: 1, limit: 10 } };
  });
  return Response.json({ data: rows, pagination: { totalRecords: rows.length, totalPages: 1, page: 1, limit: 5 } });
};
const client = createQueryClient(message => state.errors.push(message));
const store = configureStore({ reducer: () => ({ user: { businessData: { _id: business } } }) });
function Fixture() {
  const [admin, setAdmin] = useState(true);
  return <><div style={{ position: 'fixed', right: 0, bottom: 0, zIndex: 1, fontSize: 10 }}><button id="staff-mode" onClick={() => setAdmin(false)}>Staff mode</button><button id="admin-mode" onClick={() => setAdmin(true)}>Admin mode</button><button id="fail" onClick={() => { state.fail = true; void client.invalidateQueries(); }}>Fail</button><button id="recover" onClick={() => { state.fail = false; void client.invalidateQueries(); }}>Recover</button></div><EnquiryTargets key={String(admin)} admin={admin} /></>;
}
createRoot(document.getElementById('root')!).render(<SessionProvider session={{ user: { id: person }, expires: '2099-01-01' } as any}><Provider store={store}><QueryClientProvider client={client}><Fixture /></QueryClientProvider></Provider></SessionProvider>);

import { NextResponse } from 'next/server';
// Retired endpoints fail closed for cached clients. Never reinterpret an old request.
export async function handleTransition() {
  return NextResponse.json({ status: 410, message: 'Enquiry completion has been replaced by individual action completion. Refresh the page and open Follow-up actions.' }, { status: 410 });
}

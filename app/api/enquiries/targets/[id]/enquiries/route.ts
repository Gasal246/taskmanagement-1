import { NextRequest } from 'next/server';
import { targetHandler } from '@/lib/enquiries/targets-server';
export const GET = async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => targetHandler(req, 'enquiries', (await ctx.params).id);

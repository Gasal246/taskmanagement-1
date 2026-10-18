import { NextRequest } from 'next/server';
import { targetHandler } from '@/lib/enquiries/targets-server';
type Context = { params: Promise<{ id: string }> };
export const GET = async (req: NextRequest, ctx: Context) => targetHandler(req, 'detail', (await ctx.params).id);
export const PATCH = async (req: NextRequest, ctx: Context) => targetHandler(req, 'update', (await ctx.params).id);
export const DELETE = async (req: NextRequest, ctx: Context) => targetHandler(req, 'delete', (await ctx.params).id);

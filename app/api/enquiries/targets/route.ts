import { NextRequest } from 'next/server';
import { targetHandler } from '@/lib/enquiries/targets-server';
export const GET = (req: NextRequest) => targetHandler(req, 'list');
export const POST = (req: NextRequest) => targetHandler(req, 'create');

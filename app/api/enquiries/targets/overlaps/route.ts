import { NextRequest } from 'next/server';
import { targetHandler } from '@/lib/enquiries/targets-server';
export const POST = (req: NextRequest) => targetHandler(req, 'overlaps');

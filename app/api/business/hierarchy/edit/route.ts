import connectDB from '@/lib/mongo';
import Area_departments from '@/models/area_departments.model';
import Business_areas from '@/models/business_areas.model';
import Business_locations from '@/models/business_locations.model';
import Business_regions from '@/models/business_regions.model';
import Location_departments from '@/models/location_departments.model';
import Region_departments from '@/models/region_departments.model';
import { NextRequest, NextResponse } from 'next/server';

connectDB();

const hierarchyModels = {
    region: { model: Business_regions, nameField: 'region_name', scopeFields: ['business_id'] },
    area: { model: Business_areas, nameField: 'area_name', scopeFields: ['region_id'] },
    location: { model: Business_locations, nameField: 'location_name', scopeFields: ['area_id'] },
    region_department: { model: Region_departments, nameField: 'dep_name', scopeFields: ['region_id'] },
    area_department: { model: Area_departments, nameField: 'dep_name', scopeFields: ['area_id'] },
    location_department: { model: Location_departments, nameField: 'dep_name', scopeFields: ['location_id'] },
} as const;

type HierarchyItemType = keyof typeof hierarchyModels;

export async function POST(req: NextRequest) {
    try {
        const { id, name, entity_type } = await req.json() as {
            id?: string;
            name?: string;
            entity_type?: HierarchyItemType;
        };
        const trimmedName = name?.trim();
        const config = entity_type ? hierarchyModels[entity_type] : undefined;

        if (!id || !trimmedName || !config) {
            return NextResponse.json({ error: 'A valid item and name are required.' }, { status: 400 });
        }

        const model: any = config.model;
        const item = await model.findById(id);
        if (!item) {
            return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
        }

        const duplicateFilter: Record<string, unknown> = {
            _id: { $ne: id },
            [config.nameField]: trimmedName,
            status: 1,
        };
        config.scopeFields.forEach((field) => {
            duplicateFilter[field] = item[field];
        });

        const duplicate = await model.findOne(duplicateFilter);
        if (duplicate) {
            return NextResponse.json({ error: `An item named "${trimmedName}" already exists here.` }, { status: 409 });
        }

        const updatedItem = await model.findByIdAndUpdate(
            id,
            { [config.nameField]: trimmedName },
            { new: true }
        );

        return NextResponse.json({
            data: updatedItem,
            message: 'Information updated successfully.',
            status: 200,
        });
    } catch (error) {
        console.error('Failed to update hierarchy item:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

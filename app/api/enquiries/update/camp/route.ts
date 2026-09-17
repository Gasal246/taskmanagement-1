import Eq_camp_solutions from "@/models/eq_camp_solutions.model";
import { saveCampWithSolutions } from "@/app/api/helpers/camp-solutions";
import { CatalogueValidationError, validateDynamicClassification, validateDynamicSolutions } from "@/lib/enquiries/catalogue-server";
import connectDB from "@/lib/mongo";
import Eq_camp_client_company from "@/models/eq_camp_client_company.model";
import Eq_camp_landlord from "@/models/eq_camp_landlord.model";
import Eq_camp_realestate from "@/models/eq_camp_realestate.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    camp_name?: string,
    camp_capacity?: string,
    camp_occupancy?: number | string,
    camp_type?: string,
    project_sector?: string,
    facility_type?: string,
    facility_type_other?: string,
    facility_type_detail?: string,
    sector_field_values?: any,
    hotel_classification?: string,
    camp_id: string,
    visited_status?: string,
    latitude?: string,
    longitude?: string,
    country_id?: string,
    region_id?: string,
    province_id?: string,
    city_id?: string,
    area_id?: string,
    headoffice_id?: string,
    client_company?: string,
    real_estate?: string,
    landlord?: string,
    realestate_company?: string,
    landlord_company?: string
}

export async function PUT(req: NextRequest){
    try{
        const body: IBody = await req.json();
        const hasSolutions = ["solutions_required", "solution_details", "solution_other", "primary_solution", "commercial_model"].some(key => Object.prototype.hasOwnProperty.call(body, key));
        const existingSolutions: any = hasSolutions ? await Eq_camp_solutions.findOne({ camp_id: body.camp_id }).lean() : null;
        const campToEdit = await Eq_camps.findById(body.camp_id);
        if (!campToEdit) return NextResponse.json({ message: "Camp not found", status: 404 }, { status: 404 });
        const solutions = hasSolutions ? await validateDynamicSolutions({ ...existingSolutions, ...body }, existingSolutions) : null;
        if (["project_sector", "facility_type", "facility_type_other", "facility_type_detail", "sector_field_values"].some(key => Object.prototype.hasOwnProperty.call(body, key))) {
            const classification = await validateDynamicClassification({ ...campToEdit.toObject(), ...body }, campToEdit.toObject());
            Object.assign(campToEdit, classification);
        }
        const landlordName = body.landlord ?? body.landlord_company;
        const realEstateName = body.real_estate ?? body.realestate_company;

        if(landlordName){
            if(campToEdit.landlord_id){
                const landlord = await Eq_camp_landlord.findByIdAndUpdate(campToEdit.landlord_id, {$set:{
                    landlord_name: landlordName.toLowerCase().trim()   
                }});
            } else {
                const newLandlord = new Eq_camp_landlord({
                    landlord_name: landlordName.toLowerCase().trim()
                });

                const savedLandlord = await newLandlord.save();

                campToEdit.landlord_id = savedLandlord._id;
            }
        }

        if(body.client_company){
            if(campToEdit.client_company_id){
                const client_company = await Eq_camp_client_company.findByIdAndUpdate(campToEdit.client_company_id, {$set: {
                    client_company_name: body.client_company.toLowerCase().trim()
                }});
            } else {
                const newClient_company = new Eq_camp_client_company({
                    client_company_name: body.client_company.toLowerCase().trim()
                });

                const saved_client = await newClient_company.save();

                campToEdit.client_company_id = saved_client._id;
            }
        }

        if(realEstateName){
            if(campToEdit.realestate_id){
                const realestate = await Eq_camp_realestate.findByIdAndUpdate(campToEdit.realestate_id, {$set: {
                    company_name: realEstateName.toLowerCase().trim()
                }});
            } else {
                const new_realestate = new Eq_camp_realestate({
                    company_name: realEstateName.toLowerCase().trim()
                });

                const saved_realestate = await new_realestate.save();

                campToEdit.realestate_id = saved_realestate._id;
            }
        }

        if(body.camp_name !== undefined) campToEdit.camp_name = body.camp_name;
        if(body.camp_capacity !== undefined) campToEdit.camp_capacity = body.camp_capacity;
        if(body.camp_type !== undefined) campToEdit.camp_type = body.camp_type;
        if(body.visited_status !== undefined) campToEdit.visited_status = body.visited_status;
        if(body.camp_occupancy !== undefined) {
            campToEdit.camp_occupancy = Number(body.camp_occupancy);
        }
        if(body.country_id) campToEdit.country_id = body.country_id as any;
        if(body.region_id) campToEdit.region_id = body.region_id as any;
        if(body.province_id) campToEdit.province_id = body.province_id as any;
        if(body.city_id) campToEdit.city_id = body.city_id as any;
        if(body.area_id) campToEdit.area_id = body.area_id as any;
        if(body.headoffice_id !== undefined) campToEdit.headoffice_id = body.headoffice_id || null;
        if(body.latitude !== undefined) campToEdit.latitude = body.latitude;
        if(body.longitude !== undefined) campToEdit.longitude = body.longitude;

        if (solutions) await saveCampWithSolutions(campToEdit, solutions);
        else await campToEdit.save();


        return NextResponse.json({message: "camp updated", status: 200}, {status: 200});

    }catch(err){
        if (err instanceof CatalogueValidationError) return NextResponse.json({ message: err.message, status: 400 }, { status: 400 });
        console.log("Error while updating camp: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}

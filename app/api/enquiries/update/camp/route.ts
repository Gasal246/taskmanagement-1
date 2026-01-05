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
    camp_id: string,
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
        const campToEdit = await Eq_camps.findById(body.camp_id);
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
        if(body.camp_occupancy !== undefined) {
            campToEdit.camp_occupancy = Number(body.camp_occupancy);
        }
        if(body.country_id) campToEdit.country_id = body.country_id as any;
        if(body.region_id) campToEdit.region_id = body.region_id as any;
        if(body.province_id) campToEdit.province_id = body.province_id as any;
        if(body.city_id) campToEdit.city_id = body.city_id as any;
        if(body.area_id) campToEdit.area_id = body.area_id as any;
        if(body.headoffice_id !== undefined) campToEdit.headoffice_id = body.headoffice_id || null;
        if(body.latitude) campToEdit.latitude = body.latitude;
        if(body.longitude) campToEdit.longitude = body.longitude;

        await campToEdit.save();


        return NextResponse.json({message: "camp updated", status: 200}, {status: 200});

    }catch(err){
        console.log("Error while updating camp: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}

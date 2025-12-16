import connectDB from "@/lib/mongo";
import Eq_camp_client_company from "@/models/eq_camp_client_company.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camp_landlord from "@/models/eq_camp_landlord.model";
import Eq_camp_realestate from "@/models/eq_camp_realestate.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    camp_name: string,
    camp_capacity: string,
    camp_occupancy: number,
    camp_type: string,
    camp_id: string,

    headoffice_phone: string,
    headoffice_geo_loc: string,
    headffice_address: string,
    headoffice_other_details: string,

    client_company: string,
    realestate_company: string,
    landlord_company: string
}

export async function PUT(req: NextRequest){
    try{
        const body: IBody = await req.json();
        const campToEdit = await Eq_camps.findById(body.camp_id);

        if(campToEdit.headoffice_id){
            const headoffice = await Eq_camp_headoffice.findById(campToEdit.headoffice_id)
            if(body.headoffice_phone) headoffice.phone = body.headoffice_phone;
            if(body.headoffice_other_details) headoffice.other_details = body.headoffice_other_details;
            if(body.headoffice_geo_loc) headoffice.geo_location = body.headoffice_geo_loc;
            if(body.headffice_address) headoffice.address = body.headffice_address;

            await headoffice.save();

        } else {
            const newHeadOffice = new Eq_camp_headoffice({
                phone: body.headoffice_phone,
                geo_location: body.headoffice_geo_loc,
                other_details: body.headoffice_other_details,
                address: body.headffice_address
            });
            const saved_headoffice = await newHeadOffice.save();

            campToEdit.headoffice_id = saved_headoffice._id;
        }

        if(body.landlord_company){
            if(campToEdit.landlord_id){
                const landlord = await Eq_camp_landlord.findByIdAndUpdate(campToEdit.landlord_id, {$set:{
                    landlord_name: body.landlord_company.toLowerCase().trim()   
                }});
            } else {
                const newLandlord = new Eq_camp_landlord({
                    landlord_name: body.landlord_company.toLowerCase().trim()
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

        if(body.realestate_company){
            if(campToEdit.realestate_id){
                const realestate = await Eq_camp_realestate.findByIdAndUpdate(campToEdit.realestate_id, {$set: {
                    company_name: body.realestate_company.toLowerCase().trim()
                }});
            } else {
                const new_realestate = new Eq_camp_realestate({
                    company_name: body.realestate_company.toLowerCase().trim()
                });

                const saved_realestate = await new_realestate.save();

                campToEdit.realestate_id = saved_realestate._id;
            }
        }

        campToEdit.camp_name = body.camp_name;
        campToEdit.camp_occupancy = body.camp_occupancy;
        campToEdit.camp_capacity = body.camp_capacity;
        campToEdit.camp_type = body.camp_type;

        await campToEdit.save();


        return NextResponse.json({message: "camp updated", status: 200}, {status: 200});

    }catch(err){
        console.log("Error while updating camp: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
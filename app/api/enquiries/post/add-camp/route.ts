import connectDB from "@/lib/mongo";
import Eq_camp_client_company from "@/models/eq_camp_client_company.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camp_landlord from "@/models/eq_camp_landlord.model";
import Eq_camp_realestate from "@/models/eq_camp_realestate.model";
import Eq_camps from "@/models/eq_camps.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    camp_name: string,
    camp_type: string,
    landlord: string,
    real_estate: string,
    client_company: string,
    camp_capacity: string,
    camp_occupancy: number,
    country_id: string,
    region_id: string,
    province_id: string,
    city_id: string,
    area_id: string,
    ho_phone: string,
    ho_address: string,
    ho_location: string,
    ho_other_details: string
};

export async function POST(req:NextRequest){
    try{
        const body:Body = await req.json();
        
        let landlord_id = "";
        let real_estate_id = "";
        let client_company_id = "";
        let headoffice_id = "";

        if(body.landlord){
            const isLandlordAvail:any = await Eq_camp_landlord.findOne({landlord_name: body.landlord.toLowerCase().trim()});
            if(!isLandlordAvail){
                const newLandlord = new Eq_camp_landlord({
                    landlord_name: body.landlord.toLowerCase().trim()
                });
                const savedLandlord = await newLandlord.save();
                landlord_id = savedLandlord._id;
            } else {
                landlord_id = isLandlordAvail._id;
            }
        }

        if(body.real_estate){
            const isRealEstateAvail:any = await Eq_camp_realestate.findOne({company_name: body.real_estate.toLowerCase().trim()});
            if(!isRealEstateAvail){
                const newRealEstate = new Eq_camp_realestate({
                    company_name: body.real_estate.toLowerCase().trim()
                })
                const savedRealEstate = await newRealEstate.save();
                real_estate_id = savedRealEstate._id;
            } else {
                real_estate_id = isRealEstateAvail._id;
            }
        }

        if(body.client_company){
            const isCompanyAvail:any = await Eq_camp_client_company.findOne({client_company_name: body.client_company.toLowerCase().trim()});
            if(!isCompanyAvail){
                const newClientCompany = new Eq_camp_client_company({
                    client_company_name: body.client_company.toLowerCase().trim()
                })
                const savedClientCompany = await newClientCompany.save();
                client_company_id = savedClientCompany._id;
            } else {
                client_company_id = isCompanyAvail._id;
            }
        }

        if(body.ho_phone){
            const headOffice = new Eq_camp_headoffice({
                phone: body.ho_phone,
                geo_location: body.ho_location,
                other_details: body.ho_other_details,
                address: body.ho_address
            });
            const newHeadOffice = await headOffice.save();
            headoffice_id = newHeadOffice._id;
        }

        const newCamp = new Eq_camps({
            country_id: body.country_id,
            region_id: body.region_id,
            province_id: body.province_id,
            city_id: body.city_id,
            area_id: body.area_id,
            landlord_id: landlord_id || null,
            realestate_id: real_estate_id || null,
            client_company_id: client_company_id || null,
            headoffice_id: headoffice_id || null,
            camp_type: body.camp_type,
            camp_name: body.camp_name,
            camp_capacity: body.camp_capacity,
            camp_occupancy: body.camp_occupancy,
            is_active: true
        });

        const savedCamp = await newCamp.save();

        return NextResponse.json({message: "New camp created", status: 201}, {status: 201});
    }catch(err){
        console.log("Error while adding new camp: ", err);
        return NextResponse.json({message:"Internal server error", status: 500}, {status: 500});
    }
}
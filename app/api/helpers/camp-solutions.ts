import mongoose from "mongoose";
import Eq_camp_solutions from "@/models/eq_camp_solutions.model";
import type { CampSolutions } from "@/lib/enquiries/solutions";

// The camp and its service mapping must either both save or both roll back.
export async function saveCampWithSolutions(camp: any, solutions: CampSolutions) {
  await mongoose.connection.transaction(async session => {
    await camp.save({ session });
    await Eq_camp_solutions.findOneAndUpdate(
      { camp_id: camp._id }, { $set: solutions },
      { upsert: true, runValidators: true, session }
    );
  });
}

import mongoose, { ObjectId, Schema } from "mongoose";

export interface IEq_enquiry_comments extends Document {
  _id: ObjectId;
  enquiry_id: ObjectId;
  user_id: ObjectId;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const Eq_enquiry_commentsSchema: Schema = new Schema(
  {
    enquiry_id: { type: Schema.Types.ObjectId, ref: "eq_enquiry", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Eq_enquiry_comments =
  mongoose.models?.eq_enquiry_comments ||
  mongoose.model<IEq_enquiry_comments>("eq_enquiry_comments", Eq_enquiry_commentsSchema);

export default Eq_enquiry_comments;

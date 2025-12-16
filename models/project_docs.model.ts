import mongoose, { ObjectId, Schema } from "mongoose";

export interface IProjectDocs extends Document {
  _id: ObjectId;
  project_id: ObjectId;
  doc_name: string;
  doc_url: string;
  doc_type?: string | null;
  storage_path?: string | null;
  access_type: "public" | "private";
  access_to: ObjectId[];
  created_by?: ObjectId | null;
  status?: Number | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectDocsSchema: Schema = new Schema(
  {
    project_id: { type: Schema.Types.ObjectId, ref: "business_project", required: true },
    doc_name: { type: String, required: true },
    doc_url: { type: String, required: true },
    doc_type: { type: String },
    storage_path: { type: String },
    access_type: { type: String, enum: ["public", "private"], default: "public" },
    access_to: [{ type: Schema.Types.ObjectId, ref: "users" }],
    created_by: { type: Schema.Types.ObjectId, ref: "users" },
    status: { type: Number, default: 1, enum: [0, 1] },
  },
  { timestamps: true }
);

const Project_Docs = mongoose.models?.project_docs || mongoose.model<IProjectDocs>("project_docs", ProjectDocsSchema);

export default Project_Docs;

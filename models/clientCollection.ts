import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClients extends Document {
  Name: String | null;
  Region: Types.ObjectId | null;
  Area: Types.ObjectId | null;
  Details: String | null;
  AddedBy: Types.ObjectId[] | [];
  AdminId: Types.ObjectId | null;
  OpenedBy: Types.ObjectId[] | [];
  updatedAt: Date | null;
  createdAt: Date | null;
  _id: Types.ObjectId;
}

const ClientsSchema: Schema = new Schema({
  ShortName: { type: String },
  FullName: { type: String },
  Details: { type: String },
  ContactInfo: [{
    Name: { type: String },
    Designation: { type: String },
    Email: { type: String },
    Phone: { type: String },
  }],
  Region: { type: Schema.Types.ObjectId, ref: "Regions" },
  Area: { type: Schema.Types.ObjectId, ref: "Areas" },
  AddedBy: [{ type: Schema.Types.ObjectId, ref: "Users" }],
  AdminId: { type: Schema.Types.ObjectId, ref: "Users" },
  OpenedBy: [{ type: Schema.Types.ObjectId, ref: "Users" }]
}, { timestamps: true });

const Clients = mongoose.models?.Clients || mongoose.model<IClients>('Clients', ClientsSchema);

export default Clients;


import mongoose, { ObjectId, Schema } from "mongoose";

export interface ICalendar_Events extends Document {
  _id: ObjectId;
  business_id: ObjectId;
  created_by: ObjectId;
  attendee_ids: ObjectId[];
  title: string;
  description?: string | null;
  status: string;
  start_date: Date;
  end_date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const Calendar_EventsSchema: Schema = new Schema(
  {
    business_id: { type: Schema.Types.ObjectId, ref: "business", required: true },
    created_by: { type: Schema.Types.ObjectId, ref: "users", required: true },
    attendee_ids: { type: [Schema.Types.ObjectId], ref: "users", default: [] },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["To Do", "In Progress", "Completed", "Cancelled"], default: "To Do" },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
  },
  { timestamps: true }
);

Calendar_EventsSchema.index({ business_id: 1, start_date: 1, end_date: 1 });
Calendar_EventsSchema.index({ attendee_ids: 1, start_date: 1 });
Calendar_EventsSchema.index({ created_by: 1, start_date: 1 });

const Calendar_Events =
  mongoose.models?.calendar_events ||
  mongoose.model<ICalendar_Events>("calendar_events", Calendar_EventsSchema);

export default Calendar_Events;

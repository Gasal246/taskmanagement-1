import mongoose, { Document, ObjectId, Schema } from "mongoose";

export interface IActivityCommentRead extends Document {
  _id: ObjectId;
  comment_id: ObjectId;
  user_id: ObjectId;
  seen_at: Date;
}

const ActivityCommentReadSchema = new Schema<IActivityCommentRead>(
  {
    comment_id: { type: Schema.Types.ObjectId, ref: "activity_comments", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    seen_at: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

ActivityCommentReadSchema.index({ comment_id: 1, user_id: 1 }, { unique: true });
ActivityCommentReadSchema.index({ user_id: 1, seen_at: -1 });

const ActivityCommentReads =
  mongoose.models?.activity_comment_reads ||
  mongoose.model<IActivityCommentRead>("activity_comment_reads", ActivityCommentReadSchema);

export default ActivityCommentReads;

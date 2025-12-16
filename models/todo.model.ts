import mongoose, { ObjectId, Schema } from "mongoose";

export interface ITodo extends Document {
    _id: ObjectId,
    content: String,
    user_id: ObjectId,
    is_completed: Boolean,
    createdAt: Date,
    updatedAt: Date
}

const TodoSchema: Schema = new Schema({
    content: {type: String},
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    is_completed: {type: Boolean, default: false},
}, {timestamps: true});

const Todos = mongoose.models?.todos || mongoose.model<ITodo>("todos", TodoSchema);

export default Todos;
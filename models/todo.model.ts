import mongoose, { ObjectId, Schema } from "mongoose";

export type TodoPriority = "low" | "medium" | "high";

export interface ITodo extends Document {
    _id: ObjectId,
    content: String,
    user_id: ObjectId,
    is_completed: Boolean,
    completed_at?: Date,
    priority: TodoPriority,
    due_date?: Date,
    client_id?: String,
    createdAt: Date,
    updatedAt: Date
}

const TodoSchema: Schema = new Schema({
    content: {type: String, required: true, trim: true, maxlength: 240},
    user_id: {type: Schema.Types.ObjectId, ref: "users"},
    is_completed: {type: Boolean, default: false},
    completed_at: {type: Date, default: null},
    priority: {type: String, enum: ["low", "medium", "high"], default: "low"},
    due_date: {type: Date, default: null},
    client_id: {type: String, trim: true},
}, {timestamps: true});

TodoSchema.index(
    {user_id: 1, client_id: 1},
    {unique: true, partialFilterExpression: {client_id: {$type: "string"}}}
);

const Todos = mongoose.models?.todos || mongoose.model<ITodo>("todos", TodoSchema);

export default Todos;

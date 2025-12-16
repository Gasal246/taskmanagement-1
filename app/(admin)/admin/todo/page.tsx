"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useCheckTodo, useDeleteTodo, useGetAllUserTodos, usePostNewTodo } from "@/query/user/queries";
import { toast } from "sonner";

interface Todo {
    _id: string;
  content: string;
  is_completed: boolean;
  createdAt: Date;
}

const TodoPage = () => {
  const [input, setInput] = useState("");

  const {data: todos, isLoading, refetch} = useGetAllUserTodos();
  const {mutateAsync: AddTodo, isPending: isAdding} = usePostNewTodo();
  const {mutateAsync: ToggleTodo, isPending: isToggling} = useCheckTodo();
  const {mutateAsync: removeTodo, isPending: deletingTodo} = useDeleteTodo();

  useEffect(()=> {
    console.log("todos: ", todos);
  },[todos])

  const addTodo = async(e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newTodo = {
        content: input.trim(),
    };
    const res = await AddTodo(newTodo);
    console.log("add res: ", res);
    
    if(res?.status == 201){
        toast.success(res?.message);
        await refetch();
    } else {
        toast.error(res?.message || "Something went wrong");
    }
    setInput("");
  };

  const toggleTodo = async(id: string) => {
    const payload = {
        todo_id: id
    };
    const res = await ToggleTodo(payload);
    if(res?.status == 200){
        refetch();
    } else {
        toast.error(res?.message || "Something went wront");
    }
  };

  const deleteTodo = async(id: string) => {
    const res = await removeTodo(id);
    if(res?.status == 200){
        toast.success(res?.message);
        refetch();
    } else {
        toast.error(res?.message || "Something went wrong");
    }
  };

  const activeTodos = todos?.data?.filter((t:Todo) => !t?.is_completed);
  const completedTodos = todos?.data?.filter((t:Todo) => t?.is_completed);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">My Todos</h1>
          <p className="text-slate-400 mt-1">Organized and clear</p>
        </div>

        {/* Add Form */}
        <form onSubmit={addTodo} className="mb-8 flex justify-center">
          <div className="flex gap-3 w-full max-w-2xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 px-5 py-3 bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-white transition text-base"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
            >
              <Plus size={20} /> Add Task
            </button>
          </div>
        </form>

        {/* === TWO FIXED COLUMNS === */}
        <div className="grid grid-cols-2 gap-8 h-[65vh]">
          {/* LEFT: To Do */}
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                To Do ({activeTodos?.data?.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTodos?.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No pending tasks.</p>
              ) : (
                activeTodos?.map((todo:Todo) => (
                  <TodoItem key={todo._id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Completed */}
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Check size={22} className="text-green-500" />
                Completed ({completedTodos?.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {completedTodos?.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No completed tasks.</p>
              ) : (
                completedTodos?.map((todo:Todo) => (
                  <TodoItem key={todo._id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Todo Item
const TodoItem = ({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all
        ${todo?.is_completed ? "bg-slate-700/50 border-slate-600 opacity-85" : "bg-slate-700/70 border-slate-600 hover:border-slate-500"}
      `}
    >
      <button
        onClick={() => onToggle(todo._id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition
          ${todo?.is_completed ? "bg-green-600 border-green-600" : "border-slate-500 hover:border-white"}
        `}
      >
        {todo?.is_completed && <Check size={14} className="text-white" />}
      </button>

      <div className="flex-1">
        <p className={`text-sm font-medium ${todo?.is_completed ? "text-slate-300 line-through" : "text-white"}`}>
          {todo?.content}
        </p>
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
          <Clock size={12} />
          {format(new Date(todo?.createdAt), "MMM d, h:mm a")}
        </p>
      </div>

      <button onClick={() => onDelete(todo?._id)} className="text-slate-400 hover:text-red-400 transition">
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default TodoPage;
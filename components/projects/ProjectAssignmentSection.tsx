import { Avatar } from "antd";
import { motion } from "framer-motion";
import { PencilRuler, Trash2, Users } from "lucide-react";

type AssignmentUser = {
  _id?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
};

export default function ProjectAssignmentSection({
  title,
  assignLabel,
  emptyLabel,
  users,
  canManage = true,
  removing,
  onAssign,
  onRemove,
}: {
  title: string;
  assignLabel: string;
  emptyLabel: string;
  users: AssignmentUser[];
  canManage?: boolean;
  removing: boolean;
  onAssign: () => void;
  onRemove: (userId: string) => void;
}) {
  return (
    <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[20vh] mb-2 border border-slate-700/50">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-medium text-xs text-slate-300 flex items-center gap-1">
          <Users size={14} /> {title}
        </h1>
        {canManage && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-2 px-4 rounded-lg border border-slate-700 hover:border-slate-500 bg-gradient-to-tr from-slate-900 to-slate-800 cursor-pointer text-xs font-medium flex gap-1 items-center"
            onClick={onAssign}
          >
            <PencilRuler size={12} />
            {assignLabel}
          </motion.div>
        )}
      </div>
      <div className="flex flex-wrap">
        {users.length === 0 && (
          <p className="text-xs text-slate-400">{emptyLabel}</p>
        )}
        {users.map((user) => {
          const userId = user?._id?.toString?.() ?? user?._id ?? "";
          return (
            <div className="w-full p-1 sm:w-1/2 xl:w-1/4" key={userId}>
              <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-cyan-800 relative">
                <div className="flex items-center gap-3">
                  <Avatar className="shrink-0" src={user?.avatar_url || "/avatar.png"} size={40} />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{user?.name || "-"}</p>
                    <p className="text-xs text-slate-400">{user?.email || "-"}</p>
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    aria-label={`Remove ${user?.name || "user"} from ${title}`}
                    className="absolute right-2 top-2 rounded-full p-1 text-red-300 transition hover:bg-slate-800 hover:text-red-200"
                    onClick={() => onRemove(userId)}
                    disabled={removing}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

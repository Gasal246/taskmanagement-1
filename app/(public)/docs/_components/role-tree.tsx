"use client";

import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import { RoleTreeNode } from "../_data/role-docs";

interface RoleTreeProps {
  root: RoleTreeNode;
}

const collectNodeOrder = (node: RoleTreeNode, map: Map<string, number>, startAt = 0): number => {
  map.set(node.id, startAt);

  let currentIndex = startAt + 1;
  for (const child of node.children) {
    currentIndex = collectNodeOrder(child, map, currentIndex);
  }

  return currentIndex;
};

const TreeBranch = ({
  node,
  depth,
  orderMap,
}: {
  node: RoleTreeNode;
  depth: number;
  orderMap: Map<string, number>;
}) => {
  const order = orderMap.get(node.id) ?? 0;
  const delay = order * 0.07;

  return (
    <motion.li
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className="list-none"
    >
      <Link
        href={`/docs/${node.roleSlug}`}
        className="group block rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-3 transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-950/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Layer {depth + 1}</p>
            <h3 className="mt-1 text-base font-semibold text-slate-100">{node.title}</h3>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300" />
        </div>
      </Link>

      {node.children.length > 0 ? (
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.1, duration: 0.3 }}
          className="relative ml-6 mt-3 space-y-3 border-l border-slate-700/80 pl-5"
        >
          {node.children.map((child) => (
            <TreeBranch key={child.id} node={child} depth={depth + 1} orderMap={orderMap} />
          ))}
        </motion.ul>
      ) : null}
    </motion.li>
  );
};

export const RoleTree = ({ root }: RoleTreeProps) => {
  const orderMap = React.useMemo(() => {
    const map = new Map<string, number>();
    collectNodeOrder(root, map);
    return map;
  }, [root]);

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-gradient-to-b from-slate-950/70 to-slate-900/50 p-4 sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <Layers3 className="h-5 w-5 text-cyan-300" />
        <h2 className="text-lg font-semibold text-slate-100">Task Manager Hierarchy</h2>
      </div>
      <ul className="space-y-3">
        <TreeBranch node={root} depth={0} orderMap={orderMap} />
      </ul>
    </section>
  );
};

"use client";
import { useState } from "react";
// Scope changes reset during render, avoiding a request with the previous scope's cursor.
export function useCursorPaging(scope: string) {
  const [state, setState] = useState<{ scope: string; cursors: Array<string | undefined>; index: number }>({ scope, cursors: [undefined], index: 0 });
  const current = state.scope === scope ? state : { scope, cursors: [undefined], index: 0 };
  return {
    cursor: current.cursors[current.index], page: current.index + 1,
    previous: () => setState({ ...current, index: Math.max(0, current.index - 1) }),
    next: (cursor: string) => setState({ scope, cursors: [...current.cursors.slice(0, current.index + 1), cursor], index: current.index + 1 }),
  };
}

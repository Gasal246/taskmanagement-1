"use client";
import { useRef, useState, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";

// Read-only history rows can be safely unmounted. Interactive task cards retain
// their mounted sheets/forms and instead use bounded pages + content-visibility.
export default function VirtualHistoryList({ rows, renderRow }: { rows: any[]; renderRow: (row: any) => ReactNode }) {
  const parent = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => parent.current,
    getItemKey: index => String(rows[index]._id), estimateSize: () => 300, overscan: 2,
    enabled: !showAll && rows.length > 8, useFlushSync: false, initialRect: { height: 500, width: 600 } });
  if (rows.length <= 8) return <div className="space-y-3">{rows.map(row => <div key={String(row._id)}>{renderRow(row)}</div>)}</div>;
  return <section aria-label="History records" className="space-y-2">
    <Button size="sm" variant="outline" onClick={() => setShowAll(value => !value)} aria-pressed={showAll}>
      {showAll ? "Use scrolling view" : "Show all rows on this page"}
    </Button>
    {showAll ? <div className="space-y-3">{rows.map(row => <div key={String(row._id)}>{renderRow(row)}</div>)}</div> :
      <div ref={parent} tabIndex={0} role="region" aria-label="Scrollable history; arrow keys scroll" className="h-[65vh] min-h-[320px] max-h-[720px] overflow-auto rounded-lg border border-slate-800">
        <div role="list" style={{ height: virtual.getTotalSize(), position: "relative" }}>
          {virtual.getVirtualItems().map(item => <div key={item.key} data-index={item.index} ref={virtual.measureElement}
            role="listitem" aria-posinset={item.index + 1} aria-setsize={rows.length}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }} className="pb-3">
            {renderRow(rows[item.index])}
          </div>)}
        </div>
      </div>}
  </section>;
}

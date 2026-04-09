"use client";

import React, { useEffect, useRef, useState } from "react";

type MarkdownPreviewProps = {
  content?: string | null;
  className?: string;
};

const COLLAPSED_HEIGHT = 198;

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

export default function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [content]);

  useEffect(() => {
    const checkOverflow = () => {
      if (!contentRef.current) return;
      setShowToggle(contentRef.current.scrollHeight > COLLAPSED_HEIGHT + 4);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [content, expanded]);

  if (!content?.trim()) {
    return <p className={`text-sm text-slate-400 ${className}`}>-</p>;
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;

    elements.push(
      <ul key={`list-${elements.length}`} className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-sm font-semibold text-slate-100">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-base font-semibold text-white">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${elements.length}`} className="text-lg font-semibold text-white">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    elements.push(
      <p key={`p-${elements.length}`} className="text-sm leading-6 text-slate-300">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList();

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className="space-y-3 overflow-hidden"
        style={expanded ? undefined : { maxHeight: `${COLLAPSED_HEIGHT}px` }}
      >
        {elements}
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          {expanded ? "less" : "...more"}
        </button>
      )}
    </div>
  );
}

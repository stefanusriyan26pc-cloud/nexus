"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Segment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

// $$...$$ renders as a block equation, $...$ renders inline (no newlines inside).
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(MATH_PATTERN)) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "math", value: match[1], display: true });
    } else {
      segments.push({ type: "math", value: match[2], display: false });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

export function hasLatex(text: string): boolean {
  MATH_PATTERN.lastIndex = 0;
  return MATH_PATTERN.test(text);
}

export function LatexContent({ text, className }: { text: string; className?: string }) {
  const segments = useMemo(() => parseSegments(text), [text]);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {segments.map((segment, i) => {
        if (segment.type === "text") return <span key={i}>{segment.value}</span>;
        const html = katex.renderToString(segment.value, {
          displayMode: segment.display,
          throwOnError: false,
          output: "html",
        });
        return (
          <span
            key={i}
            className={cn(segment.display && "my-1 block overflow-x-auto")}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

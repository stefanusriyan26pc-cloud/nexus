"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Segment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

// $$...$$ and \[...\] render as block equations, $...$ and \(...\) inline.
const MATH_PATTERN =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

export type MathMatch = { start: number; end: number; value: string; display: boolean };

export function findMathMatches(text: string): MathMatch[] {
  const matches: MathMatch[] = [];
  for (const match of text.matchAll(MATH_PATTERN)) {
    const [raw, block, bracket, paren, inline] = match;
    if (inline !== undefined) {
      // Pandoc-style guard so currency like "$100 dan $200" stays plain text:
      // the content must hug both delimiters and the closing $ must not be
      // immediately followed by a digit.
      const next = text[match.index + raw.length];
      if (/^\s/.test(inline) || /\s$/.test(inline) || (next !== undefined && /\d/.test(next))) {
        continue;
      }
    }
    matches.push({
      start: match.index,
      end: match.index + raw.length,
      value: (block ?? bracket ?? paren ?? inline)!,
      display: block !== undefined || bracket !== undefined,
    });
  }
  return matches;
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  for (const match of findMathMatches(text)) {
    if (match.start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.start) });
    }
    segments.push({ type: "math", value: match.value, display: match.display });
    lastIndex = match.end;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

export function hasLatex(text: string): boolean {
  return findMathMatches(text).length > 0;
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

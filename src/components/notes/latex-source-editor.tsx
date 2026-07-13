"use client";

import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { useEffect, useRef, useState } from "react";

/**
 * Overleaf-style LaTeX source editor: CodeMirror with line numbers and
 * (S)TeX syntax highlighting, following the app theme.
 */
export function LatexSourceEditor({
  value,
  onChange,
  onViewReady,
}: {
  value: string;
  onChange: (value: string) => void;
  onViewReady?: (view: EditorView) => void;
}) {
  const [dark, setDark] = useState(false);
  const viewRef = useRef<EditorView | null>(null);

  // Follow the next-themes class on <html>, including live toggles.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    // Hard-constrain CodeMirror inside the flex pane: without this the editor
    // grows with its content and blows up the whole workspace layout. The
    // absolute fill guarantees an exact fit so long documents scroll
    // internally instead of pushing the footer away.
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={dark ? "dark" : "light"}
        height="100%"
        style={{ fontSize: "13px" }}
        extensions={[StreamLanguage.define(stex), EditorView.lineWrapping]}
        basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: false }}
        onCreateEditor={(view) => {
          viewRef.current = view;
          onViewReady?.(view);
        }}
        className="absolute inset-0 [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
      />
    </div>
  );
}

/** Move the caret to a 1-based source line and scroll it into view. */
export function jumpEditorToLine(view: EditorView, line: number) {
  const clamped = Math.max(1, Math.min(line, view.state.doc.lines));
  const info = view.state.doc.line(clamped);
  view.dispatch({
    selection: { anchor: info.from, head: info.to },
    scrollIntoView: true,
  });
  view.focus();
}

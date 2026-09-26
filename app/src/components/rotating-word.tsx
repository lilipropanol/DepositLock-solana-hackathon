"use client";

import { useEffect, useState } from "react";

const words = ["easy.", "clear.", "simple."];

export function RotatingWord() {
  const [state, setState] = useState<{ active: number; leaving: number | null }>({ active: 0, leaving: null });

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let clearLeaving: number | undefined;
    const interval = window.setInterval(() => {
      setState((current) => ({ active: (current.active + 1) % words.length, leaving: current.active }));
      if (clearLeaving !== undefined) window.clearTimeout(clearLeaving);
      clearLeaving = window.setTimeout(() => {
        setState((current) => ({ ...current, leaving: null }));
      }, 620);
    }, 3_200);

    return () => {
      window.clearInterval(interval);
      if (clearLeaving !== undefined) window.clearTimeout(clearLeaving);
    };
  }, []);

  return (
    <span className="rotating-words" aria-hidden="true">
      {words.map((word, index) => {
        const className = index === state.active ? "rotating-word is-current" :
          index === state.leaving ? "rotating-word is-leaving" : "rotating-word is-hidden";
        return <span className={className} key={word}>{word}</span>;
      })}
    </span>
  );
}

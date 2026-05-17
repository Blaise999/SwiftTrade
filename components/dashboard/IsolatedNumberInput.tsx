'use client';

import { memo, useEffect, useRef, useState, useCallback, InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onCommit: (next: string) => void;
  debounceMs?: number; // optional: commit while typing after N ms idle
};

/**
 * Isolated number input.
 *
 * The PROBLEM this solves: in massive trade pages (2000+ lines), an
 * uncontrolled `<input value={state} onChange={setState}>` re-renders the
 * entire page on every keystroke — including the chart and order book —
 * causing visible typing lag.
 *
 * This component owns its own local state. It only calls `onCommit` (which
 * triggers the parent re-render) when the user stops typing (debounce) or
 * the field blurs. While typing, only this tiny component re-renders.
 */
function IsolatedNumberInputBase({ value, onCommit, debounceMs = 220, ...rest }: Props) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommitted = useRef(value);

  // External changes (programmatic) should update the local value
  // ONLY when the input is not focused — otherwise we'd clobber typing.
  useEffect(() => {
    if (document.activeElement !== ref.current && value !== lastCommitted.current) {
      setLocal(value);
      lastCommitted.current = value;
    }
  }, [value]);

  const commit = useCallback((next: string) => {
    if (next === lastCommitted.current) return;
    lastCommitted.current = next;
    onCommit(next);
  }, [onCommit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), debounceMs);
  }, [commit, debounceMs]);

  const handleBlur = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    commit(local);
  }, [commit, local]);

  // Cleanup
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <input ref={ref} value={local} onChange={handleChange} onBlur={handleBlur} {...rest} />;
}

export default memo(IsolatedNumberInputBase);

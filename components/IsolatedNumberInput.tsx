'use client';

import { memo, useCallback, useEffect, useRef, useState, InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onCommit: (next: string) => void;
  debounceMs?: number;
};

/**
 * Why this exists:
 *
 * The FX/crypto/stocks trade pages are giant single-file React components
 * (2000-3000 lines each). When an `<input value={state} onChange={setState}>`
 * lives inside one, every keystroke re-renders the WHOLE page — including
 * the chart, order book and trade list. That's the input lag.
 *
 * This component owns its own local state. It only emits `onCommit` (the
 * thing that causes the parent re-render) when the user stops typing or
 * the input loses focus. Typing is fully decoupled from the heavy parent.
 */
function IsolatedNumberInputBase({ value, onCommit, debounceMs = 220, ...rest }: Props) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommitted = useRef(value);

  useEffect(() => {
    // Programmatic updates only apply when input is not focused
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

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <input ref={ref} value={local} onChange={handleChange} onBlur={handleBlur} {...rest} />;
}

export default memo(IsolatedNumberInputBase);

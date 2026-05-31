export type EditHistory<T> = {
  past: T[];
  present: T;
  future: T[];
};

export type HistoryStep<T> = {
  history: EditHistory<T>;
  value: T;
};

export function createEditHistory<T>(initialValue: T): EditHistory<T> {
  return {
    past: [],
    present: initialValue,
    future: [],
  };
}

export function pushEditHistory<T>(
  history: EditHistory<T>,
  nextValue: T,
  maxPast = 50,
): EditHistory<T> {
  if (Object.is(history.present, nextValue)) return history;

  const past = [...history.past, history.present].slice(-maxPast);
  return {
    past,
    present: nextValue,
    future: [],
  };
}

export function undoEditHistory<T>(history: EditHistory<T>): HistoryStep<T> {
  if (history.past.length === 0) {
    return { history, value: history.present };
  }

  const previous = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);
  const nextHistory = {
    past,
    present: previous,
    future: [history.present, ...history.future],
  };

  return { history: nextHistory, value: previous };
}

export function redoEditHistory<T>(history: EditHistory<T>): HistoryStep<T> {
  if (history.future.length === 0) {
    return { history, value: history.present };
  }

  const next = history.future[0];
  const future = history.future.slice(1);
  const nextHistory = {
    past: [...history.past, history.present],
    present: next,
    future,
  };

  return { history: nextHistory, value: next };
}

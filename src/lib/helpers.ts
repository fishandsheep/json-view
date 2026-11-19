/** Minimal debounce (mirrors lodash.debounce usage in the original app). */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  return debounced;
}

export const downloadTextFile = (contents: string, filename: string) => {
  const a = document.createElement("a");
  const file = new Blob([contents], { type: "text/plain" });
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

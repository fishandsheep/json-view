export const searchQuery = (value: string): Element[] => {
  const needle = value.toLowerCase();
  const spans = document.querySelectorAll("span[data-key]");
  const matched: Element[] = [];
  for (let i = 0; i < spans.length; i++) {
    const key = spans[i].getAttribute("data-key") ?? "";
    if (key.toLowerCase().includes(needle)) matched.push(spans[i]);
  }
  return matched;
};

export const cleanupHighlight = () => {
  const nodes = document.querySelectorAll(".searched, .highlight");
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove("searched", "highlight");
  }
};

export const highlightMatchedNodes = (nodes: Element[], selectedNode: number) => {
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].classList.add("searched");
  }
  nodes[selectedNode]?.classList.add("highlight");
};

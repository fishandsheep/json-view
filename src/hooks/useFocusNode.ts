import React from "react";
import useGraph from "../stores/graph";
import {
  cleanupHighlight,
  highlightMatchedNodes,
  searchQuery,
} from "../lib/search";

export const useFocusNode = () => {
  const viewPort = useGraph(state => state.viewPort);
  const [selectedNode, setSelectedNode] = React.useState(0);
  const [nodeCount, setNodeCount] = React.useState(0);
  const [value, setValue] = React.useState("");
  const debouncedValue = React.useDeferredValue(value);

  const next = React.useCallback(() => {
    setSelectedNode(current => (nodeCount > 0 ? (current + 1) % nodeCount : 0));
  }, [nodeCount]);

  const prev = React.useCallback(() => {
    setSelectedNode(current => (nodeCount > 0 ? (current - 1 + nodeCount) % nodeCount : 0));
  }, [nodeCount]);

  const clear = React.useCallback(() => {
    setValue("");
    setSelectedNode(0);
    setNodeCount(0);
    cleanupHighlight();
  }, []);

  React.useEffect(() => {
    if (!debouncedValue) {
      cleanupHighlight();
      setSelectedNode(0);
      setNodeCount(0);
      return;
    }
    if (!viewPort) return;

    const matchedNodes = searchQuery(debouncedValue);
    const matchedNode = matchedNodes[selectedNode] ?? null;

    cleanupHighlight();

    if (matchedNode instanceof HTMLElement) {
      highlightMatchedNodes(matchedNodes, selectedNode);
      setNodeCount(matchedNodes.length);
      viewPort.camera.centerFitElementIntoView(matchedNode, {
        elementExtraMarginForZoom: 200,
      });
    } else {
      setSelectedNode(0);
      setNodeCount(0);
    }
  }, [selectedNode, debouncedValue, viewPort]);

  return { value, setValue, next, prev, clear, nodeCount, selectedNode };
};

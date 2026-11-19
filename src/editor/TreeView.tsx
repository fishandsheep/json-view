import React, { useSyncExternalStore } from "react";
import { JSONTree } from "react-json-tree";
import useJson from "../stores/json";

const isLight = () => document.documentElement.dataset.theme === "light";

const Label: React.FC<{ keyPath: React.ReactNode[]; nodeType: string }> = ({
  keyPath,
  nodeType,
}) => {
  const color =
    nodeType === "Array" ? "#FC9A40" : isLight() ? "#761CEA" : "#59b8ff";
  return (
    <span style={{ color, transition: "filter .2s" }}>{keyPath[0]}:</span>
  );
};

const Value: React.FC<{ valueAsString: unknown; value: unknown }> = ({
  valueAsString,
  value,
}) => {
  const color = React.useMemo(() => {
    const light = isLight();
    if (typeof value === "number") return light ? "#FD0079" : "#e8c479";
    if (valueAsString === "true") return light ? "#748700" : "#00DC7D";
    if (valueAsString === "false") return light ? "#FF0000" : "#F85C50";
    if (valueAsString === "null") return light ? "#afafaf" : "#939598";
    return light ? "#535353" : "#DCE5E7";
  }, [value, valueAsString]);

  return <span style={{ color }}>{`${valueAsString}`}</span>;
};

export const TreeView: React.FC = () => {
  const json = useJson(state => state.json);
  const light = useSyncExternalStore(themeSubscriber, isLight);

  // Parse once per document update — the pretty-printed string of a large
  // document can exceed 1 MB.
  const data = React.useMemo<unknown>(() => {
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }, [json]);

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ paddingTop: 12, paddingLeft: 12, fontFamily: "var(--font-mono)", fontSize: 14 }}>
        <JSONTree
          hideRoot
          data={data}
          valueRenderer={(valueAsString, value) => (
            <Value valueAsString={valueAsString} value={value} />
          )}
          labelRenderer={(keyPath, nodeType) => (
            <Label keyPath={keyPath as React.ReactNode[]} nodeType={nodeType} />
          )}
          theme={{
            extend: {
              overflow: "scroll",
              height: "100%",
              scheme: "monokai",
              author: "wimer hazenberg (http://www.monokai.nl)",
              base00: light ? "#f7f7f7" : "#141414",
            },
          }}
        />
      </div>
    </div>
  );
};

/* Re-render when the persisted theme flips. */
const themeSubscriber = (cb: () => void) => {
  window.addEventListener("themechange", cb);
  return () => window.removeEventListener("themechange", cb);
};

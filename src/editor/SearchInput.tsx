import React from "react";
import { AiOutlineSearch } from "react-icons/ai";
import { LuChevronDown, LuChevronUp, LuX } from "react-icons/lu";
import { useFocusNode } from "../hooks/useFocusNode";

export const SearchInput: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { value, setValue, next, prev, clear, nodeCount, selectedNode } = useFocusNode();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const hasValue = value.length > 0;
  const hasMatches = nodeCount > 0;
  const noResults = hasValue && !hasMatches;

  const handleClose = () => {
    clear();
    onClose?.();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <AiOutlineSearch size={14} opacity={0.6} />
      <input
        ref={inputRef}
        type="search"
        id="search-node"
        value={value}
        onChange={e => setValue(e.currentTarget.value)}
        placeholder="Search nodes"
        autoComplete="off"
        spellCheck={false}
        aria-label="Search nodes"
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) prev();
            else next();
          } else if (e.key === "Escape") {
            handleClose();
          }
        }}
        style={{
          flex: 1,
          minHeight: 26,
          height: 26,
          padding: "0 4px",
          border: "none",
          background: "transparent",
          color: "var(--text-normal)",
          fontSize: 13,
          outline: "none",
        }}
      />
      {hasValue && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: noResults ? "var(--text-danger)" : "var(--text-faint)",
            padding: "0 4px",
            whiteSpace: "nowrap",
          }}
        >
          {noResults ? "No matches" : `${selectedNode + 1} / ${nodeCount}`}
        </span>
      )}
      <button
        type="button"
        className="icon-btn"
        aria-label="previous match"
        data-tip="Previous (⇧⏎)"
        data-tip-pos="top"
        disabled={!hasMatches}
        onClick={prev}
        style={{ width: 26, height: 26 }}
      >
        <LuChevronUp size={14} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="next match"
        data-tip="Next (⏎)"
        data-tip-pos="top"
        disabled={!hasMatches}
        onClick={next}
        style={{ width: 26, height: 26 }}
      >
        <LuChevronDown size={14} />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label="close search"
        data-tip="Close (Esc)"
        data-tip-pos="top"
        onClick={handleClose}
        style={{ width: 26, height: 26 }}
      >
        <LuX size={14} />
      </button>
    </div>
  );
};

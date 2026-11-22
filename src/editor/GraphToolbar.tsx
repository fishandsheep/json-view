import React from "react";
import {
  LuCopyMinus,
  LuCopyPlus,
  LuImageDown,
  LuMinus,
  LuPanelLeftOpen,
  LuPlus,
  LuSearch,
  LuSettings2,
} from "react-icons/lu";
import { MdFullscreen, MdOutlineCenterFocusStrong } from "react-icons/md";
import { TbArrowsLeftRight } from "react-icons/tb";
import { FaMoon, FaSun } from "react-icons/fa6";
import { MenuButton } from "../components/Menus";
import useConfig from "../stores/config";
import useModal from "../stores/modal";
import useGraph, { nextDirection } from "../stores/graph";
import { isEditableTarget } from "../lib/helpers";
import { SearchInput } from "./SearchInput";

const glassStyle: React.CSSProperties = {
  borderRadius: 14,
  background: "var(--glass-bg)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};

export const GraphToolbar: React.FC = () => {
  const zoomIn = useGraph(state => state.zoomIn);
  const zoomOut = useGraph(state => state.zoomOut);
  const centerView = useGraph(state => state.centerView);
  const focusFirstNode = useGraph(state => state.focusFirstNode);
  const direction = useGraph(state => state.direction);
  const setDirection = useGraph(state => state.setDirection);
  const collapsedCount = useGraph(state => state.collapsedCount);
  const expandAll = useGraph(state => state.expandAll);
  const collapseAll = useGraph(state => state.collapseAll);
  const setVisible = useModal(state => state.setVisible);
  const fullscreen = useGraph(state => state.fullscreen);
  const toggleFullscreen = useGraph(state => state.toggleFullscreen);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);
  const toggleDarkMode = useConfig(state => state.toggleDarkMode);
  const gesturesEnabled = useConfig(state => state.gesturesEnabled);
  const toggleGestures = useConfig(state => state.toggleGestures);
  const rulersEnabled = useConfig(state => state.rulersEnabled);
  const toggleRulers = useConfig(state => state.toggleRulers);

  const [searchOpen, setSearchOpen] = React.useState(false);

  const toggleDirection = () => setDirection(nextDirection(direction || "RIGHT"));

  // ⌘F toggles the graph search. Other shortcuts live in `useShortcuts`
  // (app level) so they also work in the tree view. Never steal ⌘F from a
  // focused input/Monaco editor — it means "find" there.
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.code !== "KeyF") return;
      if (e.isComposing || isEditableTarget(e.target)) return;
      e.preventDefault();
      setSearchOpen(open => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const itemStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 8,
    color: "var(--text-muted)",
    transition: "background-color 120ms ease, color 120ms ease",
  };

  const Item: React.FC<{
    label: string;
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }> = ({ label, onClick, active, children }) => (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      data-tip={label}
      data-tip-pos="top"
      onClick={onClick}
      style={{
        ...itemStyle,
        ...(active ? { background: "var(--active-bg)", color: "var(--text-normal)" } : {}),
      }}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <span aria-hidden style={{ width: 1, height: 18, background: "var(--glass-border)" }} />
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: "50%",
        translate: "-50% 0",
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {searchOpen && (
        <div style={{ ...glassStyle, padding: "6px 8px", minWidth: 360 }}>
          <SearchInput onClose={() => setSearchOpen(false)} />
        </div>
      )}
      <div style={{ ...glassStyle, display: "flex", alignItems: "center", padding: 5, gap: 2 }}>
        {fullscreen && (
          <>
            <Item label="Open editor" onClick={() => toggleFullscreen(false)}>
              <LuPanelLeftOpen size={18} />
            </Item>
            <Divider />
          </>
        )}
        <Item label="Center first item (⇧1)" onClick={focusFirstNode}>
          <MdOutlineCenterFocusStrong size={18} />
        </Item>
        <Item label="Fit to center (⇧2)" onClick={centerView}>
          <MdFullscreen size={20} />
        </Item>
        <Item label="Zoom out (⌘-)" onClick={zoomOut}>
          <LuMinus size={16} />
        </Item>
        <Item label="Zoom in (⌘+)" onClick={zoomIn}>
          <LuPlus size={16} />
        </Item>
        <Divider />
        <Item label="Export (⌘S)" onClick={() => setVisible("DownloadModal", true)}>
          <LuImageDown size={18} />
        </Item>
        <Item
          label="Search (⌘F)"
          active={searchOpen}
          onClick={() => setSearchOpen(o => !o)}
        >
          <LuSearch size={18} />
        </Item>
        <Item label="Rotate layout (⌘⇧D)" onClick={toggleDirection}>
          <TbArrowsLeftRight size={18} />
        </Item>
        <Item
          label={collapsedCount > 0 ? `Expand all (${collapsedCount} collapsed)` : "Collapse all"}
          onClick={() => (collapsedCount > 0 ? expandAll() : collapseAll())}
        >
          {collapsedCount > 0 ? <LuCopyPlus size={18} /> : <LuCopyMinus size={18} />}
        </Item>
        <Divider />
        <MenuButton
          id="graph-preferences"
          className="icon-btn"
          tip="Preferences"
          align="end"
          label={<LuSettings2 size={18} />}
        >
          <button
            type="button"
            className="menu-item"
            role="menuitem"
            onClick={() => toggleDarkMode(!darkmodeEnabled)}
          >
            <span className="item-icon">
              {darkmodeEnabled ? <FaSun size={14} /> : <FaMoon size={14} />}
            </span>
            {darkmodeEnabled ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            type="button"
            className="menu-item"
            role="menuitemradio"
            aria-checked={gesturesEnabled}
            onClick={() => toggleGestures(!gesturesEnabled)}
          >
            <span className="item-icon" />
            Zoom on Scroll
          </button>
          <button
            type="button"
            className="menu-item"
            role="menuitemradio"
            aria-checked={rulersEnabled}
            onClick={() => toggleRulers(!rulersEnabled)}
          >
            <span className="item-icon" />
            Rulers
          </button>
        </MenuButton>
      </div>
    </div>
  );
};

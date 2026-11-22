import React from "react";
import { LuChevronDown, LuPanelLeftClose } from "react-icons/lu";
import { VscCheck, VscError, VscRunAll, VscSync, VscSyncIgnored } from "react-icons/vsc";
import { IoMdCheckmark } from "react-icons/io";
import { MenuButton } from "../components/Menus";
import { toast } from "../components/Modal";
import { formats, type FileFormat } from "../enums";
import useConfig from "../stores/config";
import useFile from "../stores/file";
import useGraph from "../stores/graph";

export const BottomBar: React.FC = () => {
  const error = useFile(state => state.error);
  const setContents = useFile(state => state.setContents);
  const setFormat = useFile(state => state.setFormat);
  const currentFormat = useFile(state => state.format);
  const liveTransformEnabled = useConfig(state => state.liveTransformEnabled);
  const toggleLiveTransform = useConfig(state => state.toggleLiveTransform);
  const toggleFullscreen = useGraph(state => state.toggleFullscreen);
  const fullscreen = useGraph(state => state.fullscreen);

  const toggleEditor = () => toggleFullscreen(!fullscreen);

  const changeFormat = async (format: FileFormat) => {
    const ok = await setFormat(format);
    if (!ok) {
      toast.error(`Unable to convert the document to ${format.toUpperCase()}.`);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 6px",
        borderBottom: "1px solid var(--border)",
        background: "var(--toolbar-bg)",
        zIndex: 2,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <button
          type="button"
          className="toolbar-btn"
          aria-label="close editor"
          data-tip="Close editor"
          data-tip-pos="bottom"
          onClick={toggleEditor}
        >
          <LuPanelLeftClose size={14} />
        </button>

        {error ? (
          <div
            role="alert"
            className="toolbar-btn"
            data-tip={error}
            data-tip-pos="bottom"
            aria-live="polite"
            style={{ color: "var(--text-danger)", cursor: "default" }}
          >
            <VscError />
            <span style={{ fontWeight: 500 }}>Invalid</span>
          </div>
        ) : (
          <div
            className="toolbar-btn"
            data-tip="Content is valid"
            data-tip-pos="bottom"
            style={{ cursor: "default" }}
          >
            <VscCheck />
            <span>Valid</span>
          </div>
        )}

        <button
          type="button"
          className="toolbar-btn"
          aria-pressed={liveTransformEnabled}
          onClick={() => toggleLiveTransform(!liveTransformEnabled)}
        >
          {liveTransformEnabled ? <VscSync /> : <VscSyncIgnored />}
          <span>Live Transform</span>
        </button>

        {!liveTransformEnabled && (
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => setContents({})} /* no contents = re-parse current doc */
            disabled={!!error}
          >
            <VscRunAll />
            Click to Transform
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <MenuButton
          id="format-selector"
          label={
            <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {currentFormat.toUpperCase()}
              <LuChevronDown size={12} />
            </span>
          }
        >
          {formats.map(format => (
            <button
              key={format.value}
              type="button"
              className="menu-item"
              role="menuitemradio"
              aria-checked={currentFormat === format.value}
              onClick={() => changeFormat(format.value)}
            >
              {format.label}
              {currentFormat === format.value && <IoMdCheckmark style={{ marginLeft: "auto" }} />}
            </button>
          ))}
        </MenuButton>
      </div>
    </div>
  );
};

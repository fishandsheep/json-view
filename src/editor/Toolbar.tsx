import React from "react";
import { FaGithub } from "react-icons/fa6";
import { AiOutlineFullscreen } from "react-icons/ai";
import { LuMoon, LuSun } from "react-icons/lu";
import { VscJson, VscGroupByRefType, VscSearchFuzzy } from "react-icons/vsc";
import { MdFilterListAlt } from "react-icons/md";
import { Menubar, type MenuSpec } from "../components/Menus";
import { SegmentedControl, toast } from "../components/Modal";
import useConfig from "../stores/config";
import useFile from "../stores/file";
import useModal from "../stores/modal";
import { FileFormat, ViewMode } from "../enums";
import { downloadTextFile } from "../lib/helpers";
import { useViewMode } from "../hooks/useViewMode";

const BrandMark: React.FC = () => (
  <a
    href="/"
    aria-label="JSON Crack home"
    style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px" }}
  >
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: 7,
        background: "linear-gradient(135deg,#0964ff,#00c6ff)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 5.5C9 4.12 10.12 3 11.5 3c1.21 0 2.17.86 2.44 2 .27-1.14 1.23-2 2.44-2C17.88 3 19 4.12 19 5.5c0 4.6-5.5 8.5-5.5 8.5S8 10.1 8 5.5"
          transform="translate(-1.5 3.5)"
          fill="white"
        />
      </svg>
    </span>
    <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.4 }}>JSON CRACK</span>
  </a>
);

function fullscreenBrowser() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() =>
      toast.error("Unable to enter fullscreen mode.")
    );
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

export const Toolbar: React.FC = () => {
  const setVisible = useModal(state => state.setVisible);
  const getContents = useFile(state => state.getContents);
  const getFormat = useFile(state => state.getFormat);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);
  const toggleDarkMode = useConfig(state => state.toggleDarkMode);
  const { viewMode, changeViewMode } = useViewMode();

  const handleSave = () => {
    const format = getFormat();
    const contents = getContents();
    // Excel needs the BOM to detect UTF-8; keep it out of the editor buffer.
    downloadTextFile(
      format === FileFormat.CSV ? `\uFEFF${contents}` : contents,
      `jsoncrack.${format}`
    );
    useFile.getState().markExported();
  };

  const menus: MenuSpec[] = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "Import", onClick: () => setVisible("ImportModal", true) },
        { label: "Export", onClick: handleSave },
      ],
    },
    {
      id: "view",
      label: "View",
      content: (
        <SegmentedControl
          name="view-mode"
          value={viewMode}
          options={[
            { label: "Graph", value: ViewMode.Graph },
            { label: "Tree", value: ViewMode.Tree },
          ]}
          onChange={value => changeViewMode(value as ViewMode)}
          vertical
        />
      ),
    },
    {
      id: "tools",
      label: "Tools",
      items: [
        {
          label: "JSON Query (jq)",
          icon: <VscSearchFuzzy />,
          onClick: () => setVisible("JQModal", true),
        },
        {
          label: "JSON Path",
          icon: <MdFilterListAlt />,
          onClick: () => setVisible("JPathModal", true),
        },
        {
          label: "JSON Schema",
          icon: <VscJson />,
          onClick: () => setVisible("SchemaModal", true),
        },
        { kind: "divider" },
        {
          label: "Generate Type",
          icon: <VscGroupByRefType />,
          onClick: () => setVisible("TypeModal", true),
        },
      ],
    },
  ];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "var(--toolbar-height)",
        padding: "4px 10px",
        background: "var(--toolbar-bg)",
        borderBottom: "1px solid var(--border-strong)",
        zIndex: 36,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
        <BrandMark />
        <Menubar menus={menus} label="Editor commands" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          className="icon-btn"
          aria-label={darkmodeEnabled ? "switch to light mode" : "switch to dark mode"}
          data-tip={darkmodeEnabled ? "Light mode" : "Dark mode"}
          onClick={() => toggleDarkMode(!darkmodeEnabled)}
        >
          {darkmodeEnabled ? <LuSun size={18} /> : <LuMoon size={18} />}
        </button>
        <a
          href="https://github.com/AykutSarac/jsoncrack.com"
          target="_blank"
          rel="noopener"
          className="icon-btn"
          aria-label="GitHub repository"
          data-tip="GitHub"
        >
          <FaGithub size={20} />
        </a>
        <button
          type="button"
          className="icon-btn"
          aria-label="toggle browser fullscreen"
          data-tip="Fullscreen"
          onClick={fullscreenBrowser}
        >
          <AiOutlineFullscreen size={20} />
        </button>
      </div>
    </header>
  );
};

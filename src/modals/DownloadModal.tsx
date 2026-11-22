import React from "react";
import { FiCopy, FiDownload } from "react-icons/fi";
import { toBlob, toJpeg, toPng, toSvg } from "html-to-image";
import { Modal, SegmentedControl, toast } from "../components/Modal";
import useGraph from "../stores/graph";

enum Extensions {
  SVG = "svg",
  PNG = "png",
  JPEG = "jpeg",
}

const getDownloadFormat = (format: Extensions) => {
  switch (format) {
    case Extensions.SVG:
      return toSvg;
    case Extensions.PNG:
      return toPng;
    case Extensions.JPEG:
      return toJpeg;
  }
};

const swatches = [
  "#B80000", "#DB3E00", "#FCCB00", "#008B02", "#006B76", "#1273DE",
  "#004DCF", "#5300EB", "#EB9694", "#FAD0C3", "#FEF3BD", "#C1E1C5",
  "#BEDADC", "#C4DEF6", "#BED3F3", "#D4C4FB", "transparent",
];

function downloadURI(uri: string, name: string) {
  const link = document.createElement("a");
  link.download = name;
  link.href = uri;
  link.click();
}

/**
 * html-to-image never copies computed styles onto descendants of an <svg> subtree, and it
 * embeds no stylesheet in the serialized SVG. jsoncrack-react relies on both: node colors
 * come from inline `var(--node-*)` references defined on an ancestor div, while edge
 * presentation (`fill: none` on paths — otherwise SVG defaults to `fill: black`) and the
 * row layout / monospace fonts inside foreignObject come from CSS classes. A captured
 * clone therefore ships unresolved vars and unstyled SVG content.
 *
 * Before capture we bake everything into inline styles, then restore the originals:
 *  - SVG elements: inline the essential presentation properties from computed style.
 *    `display` is excluded on purpose (inlining `display: none` would hide <defs>,
 *    breaking marker arrowheads).
 *  - HTML inside foreignObject (skipped entirely by html-to-image): inline the full
 *    computed style, exactly what the library does for regular HTML — this carries row
 *    layout, fonts and divider lines into the clone.
 *  - HTML with `var()` references: resolve them to computed values.
 */
const SVG_PRESENTATION_PROPS = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "overflow",
  "text-align",
  "marker-end",
  "marker-start",
];

async function withResolvedNodeVars<T>(element: HTMLElement, capture: () => Promise<T>): Promise<T> {
  const originals = new Map<Element, string | null>();
  const remember = (el: Element) => {
    if (!originals.has(el)) originals.set(el, el.getAttribute("style"));
  };

  // Phase 1 — READ: collect every final inline style as a plain string.
  // Never interleave writes with reads of the same element's computed style: each
  // write invalidates the live CSSStyleDeclaration and the next read forces a full
  // style recalc, which is quadratic and takes tens of seconds on real graphs.
  const dumps: Array<[Element, string]> = [];

  for (const node of [element, ...element.querySelectorAll("*")]) {
    const el = node as HTMLElement | SVGElement;
    const computed = getComputedStyle(el);

    if (el instanceof SVGElement) {
      remember(el);
      const own = el.getAttribute("style");
      const parts: string[] = [];
      for (const prop of SVG_PRESENTATION_PROPS) {
        parts.push(`${prop}: ${computed.getPropertyValue(prop)}`);
      }
      dumps.push([el, own ? `${own};${parts.join("; ")}` : parts.join("; ")]);
      continue;
    }

    const inline = el.getAttribute("style");
    const hasVars = !!inline && inline.includes("var(");
    const insideSvg = el !== element && el.closest("svg") !== null;
    if (!insideSvg && !hasVars) continue; // outside SVG the library inlines styles itself

    remember(el);

    if (insideSvg) {
      // Bake the FULL computed style into one declaration string — exactly what
      // html-to-image does for regular HTML but skips for HTML inside <svg>. This
      // carries the class-derived row layout, monospace fonts and divider lines into
      // the clone, and pins -webkit-text-fill-color against inherited overrides.
      const parts: string[] = [];
      for (const prop of Array.from(computed)) {
        parts.push(`${prop}: ${computed.getPropertyValue(prop)}`);
      }
      dumps.push([el, parts.join("; ")]);
    } else {
      const parts: string[] = [];
      for (const prop of Array.from(el.style)) {
        const raw = el.style.getPropertyValue(prop);
        parts.push(raw.includes("var(") ? `${prop}: ${computed.getPropertyValue(prop)}` : `${prop}: ${raw}`);
      }
      // html-to-image copies the wrapper's computed `-webkit-text-fill-color` (an
      // inherited property that outranks `color`) onto the clone root, which would
      // repaint all text in that single gray. Pin each colored element's own color.
      if (inline?.includes("color")) parts.push(`-webkit-text-fill-color: ${computed.color}`);
      dumps.push([el, parts.join("; ")]);
    }
  }

  // Phase 2 — WRITE: one setAttribute per element.
  for (const [el, style] of dumps) el.setAttribute("style", style);

  try {
    return await capture();
  } finally {
    for (const [el, inline] of originals) {
      if (inline === null) el.removeAttribute("style");
      else el.setAttribute("style", inline);
    }
  }
}

/** Current canvas background as hex, so exports match the page theme by default.
 *  The canvas itself is transparent — walk up to the first opaque ancestor background. */
const getCanvasColor = (element: HTMLElement | null) => {
  let el = element;
  while (el) {
    const m = getComputedStyle(el).backgroundColor.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/);
    if (m && (m[4] === undefined || Number(m[4]) > 0)) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    }
    el = el.parentElement;
  }
  return "#FFFFFF";
};

export const DownloadModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const exportElement = useGraph(state => state.exportElement);
  const [extension, setExtension] = React.useState<Extensions>(Extensions.PNG);
  const [fileDetails, setFileDetails] = React.useState(() => ({
    filename: "jsoncrack.com",
    backgroundColor: getCanvasColor(useGraph.getState().exportElement),
    quality: 1,
  }));

  const clipboardImage = async () => {
    const loadingToast = toast.loading("Copying to clipboard...");
    try {
      if (!exportElement) return toast.error("Canvas not found.");
      const blob = await withResolvedNodeVars(exportElement, () =>
        toBlob(exportElement, {
          quality: fileDetails.quality,
          backgroundColor: fileDetails.backgroundColor,
          skipFonts: true,
        })
      );
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success("Copied to clipboard");
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error(
          "Clipboard write permission denied. Please allow clipboard access in your browser settings."
        );
      } else {
        toast.error("Failed to copy to clipboard");
      }
    } finally {
      toast.dismiss(loadingToast);
      onClose();
    }
  };

  const exportAsImage = async () => {
    const loadingToast = toast.loading("Downloading...");
    try {
      if (!exportElement) return toast.error("Canvas not found.");
      const dataURI = await withResolvedNodeVars(exportElement, () =>
        getDownloadFormat(extension)(exportElement, {
          quality: fileDetails.quality,
          backgroundColor: fileDetails.backgroundColor,
          skipFonts: true,
        })
      );
      downloadURI(dataURI, `${fileDetails.filename}.${extension}`);
    } catch {
      toast.error("Failed to download image!");
    } finally {
      toast.dismiss(loadingToast);
      onClose();
    }
  };

  const updateDetails = (key: keyof typeof fileDetails, value: string | number) =>
    setFileDetails({ ...fileDetails, [key]: value });

  return (
    <Modal open={open} onClose={onClose} title="Download Image">
      <div>
        <label className="field-label" htmlFor="dl-filename">File Name</label>
        <input
          id="dl-filename"
          className="text-input"
          value={fileDetails.filename}
          onChange={e => updateDetails("filename", e.target.value)}
        />
      </div>
      <SegmentedControl
        name="dl-format"
        value={extension}
        options={[
          { label: "PNG", value: Extensions.PNG },
          { label: "JPEG", value: Extensions.JPEG },
          { label: "SVG", value: Extensions.SVG },
        ]}
        onChange={v => setExtension(v as Extensions)}
        style={{ width: "100%" }}
      />
      <div>
        <label className="field-label" htmlFor="dl-bgcolor">Background Color</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            id="dl-bgcolor"
            type="color"
            aria-label="pick custom background color"
            value={fileDetails.backgroundColor === "transparent" ? "#ffffff" : fileDetails.backgroundColor}
            onChange={e => updateDetails("backgroundColor", e.target.value)}
            style={{ width: 40, height: 34, padding: 2, border: "1px solid var(--border)", borderRadius: 6, background: "var(--input-bg)" }}
          />
          <input
            className="text-input"
            style={{ flex: 1 }}
            value={fileDetails.backgroundColor}
            onChange={e => updateDetails("backgroundColor", e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
          {swatches.map(swatch => (
            <button
              key={swatch}
              type="button"
              aria-label={`background color ${swatch}`}
              onClick={() => updateDetails("backgroundColor", swatch)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background:
                  swatch === "transparent"
                    ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 10px 10px"
                    : swatch,
                border: "1px solid var(--border)",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
        <button type="button" className="btn secondary" onClick={clipboardImage}>
          <FiCopy /> Clipboard
        </button>
        <button type="button" className="btn success" onClick={exportAsImage}>
          <FiDownload /> Download
        </button>
      </div>
    </Modal>
  );
};

import React from "react";
import useModal from "../stores/modal";
import { ImportModal } from "./ImportModal";
import { DownloadModal } from "./DownloadModal";
import { JQModal } from "./JQModal";
import { JPathModal } from "./JPathModal";
import { SchemaModal } from "./SchemaModal";
import { TypeModal } from "./TypeModal";
import { NodeModal } from "./NodeModal";

/** Central modal switchboard — the originals render every modal up front;
 * here each dialog mounts only while open. */
export const ModalController: React.FC = () => {
  const state = useModal();

  return (
    <>
      {state.ImportModal && <ImportModal open onClose={() => state.setVisible("ImportModal", false)} />}
      {state.DownloadModal && (
        <DownloadModal open onClose={() => state.setVisible("DownloadModal", false)} />
      )}
      {state.JQModal && <JQModal open onClose={() => state.setVisible("JQModal", false)} />}
      {state.JPathModal && (
        <JPathModal open onClose={() => state.setVisible("JPathModal", false)} />
      )}
      {state.SchemaModal && (
        <SchemaModal open onClose={() => state.setVisible("SchemaModal", false)} />
      )}
      {state.TypeModal && <TypeModal open onClose={() => state.setVisible("TypeModal", false)} />}
      {state.NodeModal && <NodeModal open onClose={() => state.setVisible("NodeModal", false)} />}
    </>
  );
};

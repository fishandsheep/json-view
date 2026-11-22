import { create } from "zustand";

const modalNames = [
  "ImportModal",
  "DownloadModal",
  "JQModal",
  "JPathModal",
  "SchemaModal",
  "TypeModal",
  "NodeModal",
] as const;

type ModalName = (typeof modalNames)[number];

interface ModalActions {
  setVisible: (name: ModalName, open: boolean) => void;
}

type ModalState = Record<ModalName, boolean>;

const initialStates = modalNames.reduce(
  (acc, modal) => ({ ...acc, [modal]: false }),
  {} as ModalState
);

const useModal = create<ModalState & ModalActions>()(set => ({
  ...initialStates,
  setVisible: (name, open) => set({ [name]: open }),
}));

export default useModal;

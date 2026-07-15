import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IntegrationProvider =
  | "github"
  | "figma"
  | "notion"
  | "googleDocs"
  | "googleSlides";

type IntegrationAccounts = Record<IntegrationProvider, boolean>;

interface IntegrationState {
  accounts: IntegrationAccounts;
  connect: (provider: IntegrationProvider) => void;
  disconnect: (provider: IntegrationProvider) => void;
}

const initialAccounts: IntegrationAccounts = {
  github: true,
  figma: true,
  notion: false,
  googleDocs: false,
  googleSlides: true,
};

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set) => ({
      accounts: initialAccounts,
      connect: (provider) =>
        set((state) => ({
          accounts: { ...state.accounts, [provider]: true },
        })),
      disconnect: (provider) =>
        set((state) => ({
          accounts: { ...state.accounts, [provider]: false },
        })),
    }),
    {
      name: "plog-integrations",
      partialize: (state) => ({ accounts: state.accounts }),
    }
  )
);

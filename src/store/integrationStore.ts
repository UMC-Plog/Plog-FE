import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IntegrationProvider =
  | "github"
  | "figma"
  | "notion"
  | "googleDocs"
  | "googleSlides";

type IntegrationAccounts = Record<IntegrationProvider, boolean>;
type ProjectIntegrationAccounts = Record<string, IntegrationAccounts>;

interface IntegrationState {
  accounts: IntegrationAccounts;
  projectAccounts: ProjectIntegrationAccounts;
  connect: (provider: IntegrationProvider) => void;
  disconnect: (provider: IntegrationProvider) => void;
  connectProject: (projectId: string, provider: IntegrationProvider) => void;
  disconnectProject: (projectId: string, provider: IntegrationProvider) => void;
}

const initialAccounts: IntegrationAccounts = {
  github: false,
  figma: false,
  notion: false,
  googleDocs: false,
  googleSlides: false,
};

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set) => ({
      accounts: initialAccounts,
      projectAccounts: {},
      connect: (provider) =>
        set((state) => ({
          accounts: { ...state.accounts, [provider]: true },
        })),
      disconnect: (provider) =>
        set((state) => ({
          accounts: { ...state.accounts, [provider]: false },
        })),
      connectProject: (projectId, provider) =>
        set((state) => ({
          projectAccounts: {
            ...state.projectAccounts,
            [projectId]: {
              ...initialAccounts,
              ...state.projectAccounts[projectId],
              [provider]: true,
            },
          },
        })),
      disconnectProject: (projectId, provider) =>
        set((state) => ({
          projectAccounts: {
            ...state.projectAccounts,
            [projectId]: {
              ...initialAccounts,
              ...state.projectAccounts[projectId],
              [provider]: false,
            },
          },
        })),
    }),
    {
      name: "plog-integrations",
      partialize: (state) => ({
        accounts: state.accounts,
        projectAccounts: state.projectAccounts,
      }),
    }
  )
);

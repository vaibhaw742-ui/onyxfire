"use client";

import { CombinedSettings } from "@/app/admin/settings/interfaces";
import { UserProvider } from "@/components/user/UserProvider";
import { ProviderContextProvider } from "@/components/chat/ProviderContext";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { User } from "@/lib/types";
import { ModalProvider } from "@/components/context/ModalContext";
import { AuthTypeMetadata } from "@/lib/userSS";
import { AppSidebarProvider } from "@/refresh-components/contexts/AppSidebarContext";
import { KnowledgeBankProvider } from "@/refresh-components/contexts/KnowledgeBankContext";

interface AppProviderProps {
  children: React.ReactNode;
  user: User | null;
  settings: CombinedSettings;
  authTypeMetadata: AuthTypeMetadata;
  folded?: boolean;
  knowledgeBankOpen?: boolean;
}

export default function AppProvider({
  children,
  user,
  settings,
  authTypeMetadata,
  folded,
  knowledgeBankOpen,
}: AppProviderProps) {
  return (
    <SettingsProvider settings={settings}>
      <UserProvider
        settings={settings}
        user={user}
        authTypeMetadata={authTypeMetadata}
      >
        <ProviderContextProvider>
          <ModalProvider user={user}>
            <AppSidebarProvider folded={!!folded}>
              <KnowledgeBankProvider initialOpen={knowledgeBankOpen ?? true}>
                {children}
              </KnowledgeBankProvider>
            </AppSidebarProvider>
          </ModalProvider>
        </ProviderContextProvider>
      </UserProvider>
    </SettingsProvider>
  );
}

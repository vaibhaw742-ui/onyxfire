import { redirect } from "next/navigation";
import type { Route } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAuth } from "@/lib/auth/requireAuth";
import { ProjectsProvider } from "./projects/ProjectsContext";
import AppSidebar from "@/sections/sidebar/AppSidebar";
import KnowledgeBank from "@/sections/knowledge-bank/KnowledgeBank";
import ChatContainer from "@/sections/chat-container/ChatContainer";

export interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  noStore();

  // Only check authentication - data fetching is done client-side via SWR hooks
  const authResult = await requireAuth();

  if (authResult.redirect) {
    redirect(authResult.redirect as Route);
  }

  return (
    <ProjectsProvider>
      <div className="flex flex-row w-full h-full bg-background p-2 gap-2">
        <AppSidebar />
        <ChatContainer>
          {children}
        </ChatContainer>
        <KnowledgeBank />
      </div>
    </ProjectsProvider>
  );
}

"use client";

import Text from "@/refresh-components/texts/Text";
import IconButton from "@/refresh-components/buttons/IconButton";
import { SvgSliders, SvgMoreHorizontal } from "@opal/icons";

interface ChatContainerHeaderProps {
  onSettingsClick?: () => void;
  onMoreClick?: () => void;
}

function ChatContainerHeader({ onSettingsClick, onMoreClick }: ChatContainerHeaderProps) {
  return (
    <div className="flex flex-row w-full items-center justify-between gap-2 py-3 px-4">
      <Text as="p" headingH3 text02>
        Chat
      </Text>
      <div className="flex items-center gap-1">
        <IconButton
          icon={SvgSliders}
          tertiary
          onClick={onSettingsClick}
          tooltip="Settings"
        />
        <IconButton
          icon={SvgMoreHorizontal}
          tertiary
          onClick={onMoreClick}
          tooltip="More options"
        />
      </div>
    </div>
  );
}

interface ChatContainerProps {
  children: React.ReactNode;
}

export default function ChatContainer({ children }: ChatContainerProps) {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-background-tint-01 rounded-3xl overflow-hidden">
      <ChatContainerHeader />
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

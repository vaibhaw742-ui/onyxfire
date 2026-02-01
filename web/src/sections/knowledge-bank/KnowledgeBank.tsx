"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import Text from "@/refresh-components/texts/Text";
import IconButton from "@/refresh-components/buttons/IconButton";
import { useKnowledgeBankContext } from "@/refresh-components/contexts/KnowledgeBankContext";
import {
  SvgSidebar,
  SvgFolder,
  SvgFolderOpen,
  SvgFileText,
  SvgChevronRight,
  SvgChevronDown,
} from "@opal/icons";

// File type icons based on extension
function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  // For now, use a generic file icon - can be extended later
  return SvgFileText;
}

// Color for file icons based on type
function getFileIconColor(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "text-blue-400";
    case "py":
      return "text-yellow-400";
    case "json":
      return "text-green-400";
    case "config":
      return "text-purple-400";
    default:
      return "text-text-03";
  }
}

interface FileItemProps {
  name: string;
  depth: number;
  onClick?: () => void;
}

function FileItem({ name, depth, onClick }: FileItemProps) {
  const FileIcon = getFileIcon(name);
  const iconColor = getFileIconColor(name);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 py-1.5 px-2 rounded-08",
        "hover:bg-background-tint-03 transition-colors cursor-pointer",
        "text-left"
      )}
      style={{ paddingLeft: `${depth * 1}rem` }}
    >
      <FileIcon className={cn("w-4 h-4 flex-shrink-0", iconColor)} />
      <Text as="span" text02 mainUiBody className="truncate">
        {name}
      </Text>
    </button>
  );
}

interface FolderItemProps {
  name: string;
  depth: number;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

function FolderItem({
  name,
  depth,
  children,
  defaultOpen = false,
}: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const ChevronIcon = isOpen ? SvgChevronDown : SvgChevronRight;
  const FolderIcon = isOpen ? SvgFolderOpen : SvgFolder;

  return (
    <div>
      <button
        onClick={toggleOpen}
        className={cn(
          "w-full flex items-center gap-1 py-1.5 px-2 rounded-08",
          "hover:bg-background-tint-03 transition-colors cursor-pointer",
          "text-left"
        )}
        style={{ paddingLeft: `${depth * 1}rem` }}
      >
        <ChevronIcon className="w-3 h-3 flex-shrink-0 text-text-03" />
        <FolderIcon className="w-4 h-4 flex-shrink-0 text-amber-400" />
        <Text as="span" text02 mainUiBody className="truncate">
          {name}
        </Text>
      </button>
      {isOpen && <div className="flex flex-col">{children}</div>}
    </div>
  );
}

interface HeaderProps {
  onClose: () => void;
}

function Header({ onClose }: HeaderProps) {
  return (
    <div className="flex flex-row w-full items-center justify-between gap-2 py-3 px-3">
      <Text as="p" headingH3 text02>
        Knowledge Bank
      </Text>
      <IconButton
        icon={SvgSidebar}
        tertiary
        onClick={onClose}
        tooltip="Close Knowledge Bank"
      />
    </div>
  );
}

function Footer() {
  return (
    <div className="px-3 py-3">
      <Text as="p" text03 secondaryBody>
        Select a file to view architecture specs.
      </Text>
    </div>
  );
}

// Sample data structure for the knowledge bank tree
// This will later be replaced with backend data
const SAMPLE_TREE_DATA = [
  {
    type: "folder" as const,
    name: "Agents",
    defaultOpen: true,
    children: [
      { type: "file" as const, name: "orchestrator.ts" },
      { type: "file" as const, name: "tools_registry.py" },
      { type: "file" as const, name: "memory_buffer.ts" },
    ],
  },
  {
    type: "folder" as const,
    name: "RAG",
    defaultOpen: true,
    children: [
      { type: "file" as const, name: "ingest_vdb.py" },
      { type: "file" as const, name: "retriever.py" },
      { type: "file" as const, name: "reranker_v2.json" },
    ],
  },
  {
    type: "folder" as const,
    name: "LLM Training",
    defaultOpen: true,
    children: [
      { type: "file" as const, name: "train_lora.py" },
      { type: "file" as const, name: "dataset_gen.ts" },
      { type: "file" as const, name: "weights.config" },
    ],
  },
  {
    type: "folder" as const,
    name: "LLM Inference",
    defaultOpen: false,
    children: [],
  },
];

type TreeNode =
  | { type: "folder"; name: string; defaultOpen?: boolean; children: TreeNode[] }
  | { type: "file"; name: string };

interface TreeViewProps {
  nodes: TreeNode[];
  depth?: number;
  onFileClick?: (fileName: string) => void;
}

function TreeView({ nodes, depth = 0, onFileClick }: TreeViewProps) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "folder") {
          return (
            <FolderItem
              key={`${node.name}-${index}`}
              name={node.name}
              depth={depth}
              defaultOpen={node.defaultOpen}
            >
              <TreeView
                nodes={node.children}
                depth={depth + 1}
                onFileClick={onFileClick}
              />
            </FolderItem>
          );
        }
        return (
          <FileItem
            key={`${node.name}-${index}`}
            name={node.name}
            depth={depth + 1}
            onClick={() => onFileClick?.(node.name)}
          />
        );
      })}
    </>
  );
}

interface KnowledgeBankInnerProps {
  onClose: () => void;
}

const KnowledgeBankInner = memo(({ onClose }: KnowledgeBankInnerProps) => {
  const handleFileClick = useCallback((fileName: string) => {
    // TODO: Implement file selection logic when backend is ready
    console.log("Selected file:", fileName);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background-tint-02 w-[18rem] rounded-2xl">
      <Header onClose={onClose} />
      <div className="flex-1 overflow-y-auto py-2 px-1">
        <TreeView nodes={SAMPLE_TREE_DATA} onFileClick={handleFileClick} />
      </div>
      <Footer />
    </div>
  );
});
KnowledgeBankInner.displayName = "KnowledgeBankInner";

export default function KnowledgeBank() {
  const { open, setOpen } = useKnowledgeBankContext();

  if (!open) return null;

  return (
    <div className="flex-shrink-0 h-full">
      <KnowledgeBankInner onClose={() => setOpen(false)} />
    </div>
  );
}

"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
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
  SvgCopy,
  SvgSearch,
  SvgCode,
  SvgArrowLeft,
} from "@opal/icons";

// Constants for resize constraints
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 288; // 18rem
const COLLAPSED_WIDTH = 52; // 3.25rem

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
  onBack?: () => void;
  title?: string;
}

function Header({ onClose, onBack, title = "Knowledge Bank" }: HeaderProps) {
  return (
    <div className="flex flex-row w-full items-center justify-between gap-2 py-3 px-3">
      <div className="flex items-center gap-1 min-w-0">
        {onBack && (
          <IconButton
            icon={SvgArrowLeft}
            tertiary
            onClick={onBack}
            tooltip="Back to tree"
          />
        )}
        <Text as="p" headingH3 text02 className="truncate">
          {title}
        </Text>
      </div>
      <IconButton
        icon={SvgSidebar}
        tertiary
        onClick={onClose}
        tooltip="Close Knowledge Bank"
      />
    </div>
  );
}

interface FooterProps {
  selectedPath?: string;
}

function Footer({ selectedPath }: FooterProps) {
  return (
    <div className="px-3 py-2 border-t border-border-subtle">
      <Text as="p" text03 secondaryBody className="truncate font-mono text-xs">
        {selectedPath ? `~/categories/${selectedPath}` : "~/categories"}
      </Text>
    </div>
  );
}

type TreeNode =
  | { type: "folder"; name: string; defaultOpen?: boolean; children: TreeNode[] }
  | { type: "file"; name: string; path: string };

interface TreeViewProps {
  nodes: TreeNode[];
  depth?: number;
  onFileClick?: (path: string, name: string) => void;
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
            onClick={() => onFileClick?.(node.path, node.name)}
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
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // File content state
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState("");

  // Connect to SSE watch endpoint for real-time updates
  useEffect(() => {
    let abortController: AbortController | null = new AbortController();

    const connectSSE = async () => {
      try {
        const response = await fetch("/api/knowledge-bank/watch", {
          headers: { Accept: "text/event-stream" },
          signal: abortController!.signal,
        });

        if (!response.ok) {
          setErrorMsg(`Server responded with ${response.status}`);
          setStatus("error");
          return;
        }
        if (!response.body) {
          setErrorMsg("No response body");
          setStatus("error");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";
        let currentData = "";

        const dispatchEvent = () => {
          if (currentData !== "") {
            try {
              const tree = JSON.parse(currentData) as TreeNode[];
              setTreeData(tree);
              setStatus("ok");
            } catch {
              // ignore malformed JSON
            }
          }
          currentEvent = "";
          currentData = "";
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.replace(/\r$/, "");
            if (trimmed === "") {
              if (currentEvent === "change") dispatchEvent();
              currentEvent = "";
              currentData = "";
            } else if (trimmed.startsWith("event:")) {
              currentEvent = trimmed.slice("event:".length).trim();
            } else if (trimmed.startsWith("data:")) {
              const piece = trimmed.slice("data:".length).trimStart();
              currentData = currentData ? currentData + "\n" + piece : piece;
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setStatus("error");
          setErrorMsg("Connection lost — retrying…");
          setTimeout(() => {
            if (abortController) {
              setStatus("loading");
              setErrorMsg("");
              connectSSE();
            }
          }, 3000);
        }
      }
    };

    connectSSE();

    return () => {
      abortController?.abort();
      abortController = null;
    };
  }, []);

  const handleFileClick = useCallback(async (path: string, name: string) => {
    setSelectedFile({ path, name });
    setFileContent(null);
    setFileError("");
    setFileLoading(true);
    try {
      const res = await fetch(
        `/api/knowledge-bank/file?path=${encodeURIComponent(path)}`
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = await res.text();
      setFileContent(text);
    } catch (e: any) {
      setFileError(`Failed to load: ${e.message}`);
    } finally {
      setFileLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedFile(null);
    setFileContent(null);
    setFileError("");
  }, []);

  if (selectedFile) {
    return (
      <div className="h-full w-full flex flex-col">
        <Header
          onClose={onClose}
          onBack={handleBack}
          title={selectedFile.name}
        />
        <div className="flex-1 overflow-y-auto p-3">
          {fileLoading ? (
            <Text as="p" text03 secondaryBody>
              Loading…
            </Text>
          ) : fileError ? (
            <Text as="p" text03 secondaryBody>
              {fileError}
            </Text>
          ) : (
            <pre className="text-xs text-text-02 whitespace-pre-wrap break-words font-mono leading-relaxed">
              {fileContent}
            </pre>
          )}
        </div>
        <Footer selectedPath={selectedFile.path} />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <Header onClose={onClose} />
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {status === "loading" ? (
          <div className="px-3 py-4">
            <Text as="p" text03 secondaryBody>
              Loading…
            </Text>
          </div>
        ) : status === "error" ? (
          <div className="px-3 py-4">
            <Text as="p" text03 secondaryBody>
              {errorMsg || "Failed to connect"}
            </Text>
          </div>
        ) : treeData.length === 0 ? (
          <div className="px-3 py-4">
            <Text as="p" text03 secondaryBody>
              ~/categories is empty
            </Text>
          </div>
        ) : (
          <TreeView nodes={treeData} onFileClick={handleFileClick} />
        )}
      </div>
      <Footer />
    </div>
  );
});
KnowledgeBankInner.displayName = "KnowledgeBankInner";

// Collapsed sidebar with icon strip
interface CollapsedSidebarProps {
  onExpand: () => void;
}

function CollapsedSidebar({ onExpand }: CollapsedSidebarProps) {
  return (
    <div className="h-full w-full flex flex-col py-3">
      <div className="flex flex-col items-center gap-1">
        <IconButton
          icon={SvgCopy}
          tertiary
          onClick={onExpand}
          tooltip="Documents"
        />
        <IconButton
          icon={SvgFolder}
          tertiary
          onClick={onExpand}
          tooltip="Folders"
        />
        <IconButton
          icon={SvgSearch}
          tertiary
          onClick={onExpand}
          tooltip="Search"
        />
        <IconButton
          icon={SvgCode}
          tertiary
          onClick={onExpand}
          tooltip="Code"
        />
      </div>
    </div>
  );
}

// Resize handle component
interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void;
  isResizing: boolean;
}

function ResizeHandle({ onResizeStart, isResizing }: ResizeHandleProps) {
  return (
    <div
      className={cn(
        "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
        "hover:bg-interactive-primary/50 active:bg-interactive-primary",
        "transition-colors duration-150",
        isResizing && "bg-interactive-primary"
      )}
      onMouseDown={onResizeStart}
    />
  );
}

export default function KnowledgeBank() {
  const { open, setOpen } = useKnowledgeBankContext();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem("knowledge_bank_width");
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle resize during mouse move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // Calculate new width based on mouse position from right edge of viewport
      const viewportWidth = window.innerWidth;
      const newWidth = viewportWidth - e.clientX - 8; // 8px for padding

      // Clamp to min/max constraints
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Save width to localStorage
      localStorage.setItem("knowledge_bank_width", width.toString());
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add cursor style to body during resize
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, width]);

  return (
    <div className="flex-shrink-0 h-full" ref={containerRef}>
      <div
        className={cn(
          "h-full flex flex-col bg-background-tint-02 rounded-2xl overflow-hidden relative",
          !isResizing && "transition-[width] duration-200 ease-in-out"
        )}
        style={{ width: open ? `${width}px` : `${COLLAPSED_WIDTH}px` }}
      >
        {open && (
          <ResizeHandle
            onResizeStart={handleResizeStart}
            isResizing={isResizing}
          />
        )}
        {open ? (
          <KnowledgeBankInner onClose={() => setOpen(false)} />
        ) : (
          <CollapsedSidebar onExpand={() => setOpen(true)} />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Code2,
  Video,
  Table as TableIcon,
  Quote,
  List,
  ListOrdered,
  Minus,
  Image as ImageIcon,
  Sparkles,
  Search,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckSquare,
  Strikethrough as StrikethroughIcon,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: "text" | "code" | "media" | "structure" | "callout";
  action: () => void;
}

interface SlashMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (commandId: string) => void;
  position?: { top: number; left: number };
}

export default function SlashMenu({
  isOpen,
  onClose,
  onSelect,
}: SlashMenuProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = [
    {
      id: "h1",
      title: "Heading 1",
      description: "Large section title",
      icon: Heading1,
      category: "text" as const,
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium section heading",
      icon: Heading2,
      category: "text" as const,
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Small subsection heading",
      icon: Heading3,
      category: "text" as const,
    },
    {
      id: "note",
      title: "Note Alert (> [!NOTE])",
      description: "Blue informational alert box",
      icon: Info,
      category: "callout" as const,
    },
    {
      id: "tip",
      title: "Tip Alert (> [!TIP])",
      description: "Green helpful tip & tricks box",
      icon: Sparkles,
      category: "callout" as const,
    },
    {
      id: "warning",
      title: "Warning Alert (> [!WARNING])",
      description: "Amber warning highlight box",
      icon: AlertTriangle,
      category: "callout" as const,
    },
    {
      id: "important",
      title: "Important Alert (> [!IMPORTANT])",
      description: "Purple crucial information box",
      icon: AlertCircle,
      category: "callout" as const,
    },
    {
      id: "caution",
      title: "Caution Alert (> [!CAUTION])",
      description: "Red critical risk or danger alert",
      icon: AlertCircle,
      category: "callout" as const,
    },
    {
      id: "task-list",
      title: "Task Checklist (- [ ])",
      description: "Interactive checklist items",
      icon: CheckSquare,
      category: "structure" as const,
    },
    {
      id: "code",
      title: "Code Block",
      description: "Syntax highlighted code snippet",
      icon: Code2,
      category: "code" as const,
    },
    {
      id: "youtube",
      title: "YouTube Video",
      description: "Embed interactive YouTube player",
      icon: Video,
      category: "media" as const,
    },
    {
      id: "twitter",
      title: "Twitter / X Post",
      description: "Embed tweet card directly",
      icon: Sparkles,
      category: "media" as const,
    },
    {
      id: "table",
      title: "Table",
      description: "Responsive structured table",
      icon: TableIcon,
      category: "structure" as const,
    },
    {
      id: "callout",
      title: "Standard Quote Box",
      description: "Italic blockquote callout",
      icon: Quote,
      category: "text" as const,
    },
    {
      id: "bullet-list",
      title: "Bullet List",
      description: "Unordered bulleted points",
      icon: List,
      category: "structure" as const,
    },
    {
      id: "numbered-list",
      title: "Numbered List",
      description: "Sequential ordered steps",
      icon: ListOrdered,
      category: "structure" as const,
    },
    {
      id: "timestamp",
      title: "Video Timestamp",
      description: "Clickable seek button (e.g. 01:23)",
      icon: Clock,
      category: "media" as const,
    },
    {
      id: "strikethrough",
      title: "Strikethrough",
      description: "Crossed-out text (~~text~~)",
      icon: StrikethroughIcon,
      category: "text" as const,
    },
    {
      id: "embed-post",
      title: "BlogX Post Embed",
      description: "Embed an internal post card (::post[id])",
      icon: Quote,
      category: "media" as const,
    },
    {
      id: "embed-blog",
      title: "Related Article Card",
      description: "Embed a related blog card (::blog[slug])",
      icon: Sparkles,
      category: "media" as const,
    },
    {
      id: "image",
      title: "Inline Image",
      description: "Insert image anywhere in article (![alt](url))",
      icon: ImageIcon,
      category: "media" as const,
    },
    {
      id: "divider",
      title: "Divider",
      description: "Visual separation line",
      icon: Minus,
      category: "structure" as const,
    },
  ];

  const filteredCommands = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? filteredCommands.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        onSelect(filteredCommands[selectedIndex].id);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32 px-4 bg-background/30 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl overflow-hidden p-1.5 text-popover-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 mb-1">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground outline-hidden"
          />
          <kbd className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto space-y-1 py-1 pr-1"
        >
          {filteredCommands.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No matching commands
            </p>
          ) : (
            filteredCommands.map((command, idx) => {
              const Icon = command.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={command.id}
                  type="button"
                  onClick={() => {
                    onSelect(command.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl text-left flex items-center gap-3 transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center shrink-0 border",
                      isSelected
                        ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground"
                        : "bg-muted/80 border-border/60 text-muted-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold leading-tight truncate">
                      {command.title}
                    </h4>
                    <p
                      className={cn(
                        "text-[11px] leading-tight truncate",
                        isSelected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      )}
                    >
                      {command.description}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="pt-2 px-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
        </div>
      </div>
    </div>
  );
}

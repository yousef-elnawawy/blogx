"use client";

import { useState } from "react";
import { Check, Copy, Terminal, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  language?: string;
  code: string;
  className?: string;
}

// Tokenizer for syntax highlighting keywords, strings, comments, numbers, and functions
function highlightSyntax(code: string, lang = "javascript"): React.ReactNode[] {
  const lines = code.split("\n");

  return lines.map((line, lineIdx) => {
    // Comment match (// or # or /* */)
    if (/^\s*(\/\/|#|\/\*|\*)/.test(line)) {
      return (
        <div key={lineIdx} className="table-row">
          <span className="table-cell select-none pr-4 text-right text-xs font-mono text-zinc-600 dark:text-zinc-500">
            {lineIdx + 1}
          </span>
          <span className="table-cell font-mono text-xs sm:text-sm text-zinc-500 italic">
            {line}
          </span>
        </div>
      );
    }

    // Split line into colored tokens
    const tokens = line.split(
      /(\b(?:function|return|const|let|var|if|else|for|while|import|export|from|class|extends|public|private|protected|static|use|namespace|fn|def|async|await|try|catch|new|this|self|null|true|false|nil|interface|type|enum|package|struct)\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+\b|[{}()[\].,:;=+\-*/<>!&|%])/g
    );

    return (
      <div key={lineIdx} className="table-row hover:bg-white/5 transition-colors">
        <span className="table-cell select-none pr-4 text-right text-xs font-mono text-zinc-600 dark:text-zinc-500 w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell font-mono text-xs sm:text-sm whitespace-pre">
          {tokens.map((token, tokenIdx) => {
            if (!token) return null;

            // Keywords
            if (
              /^(function|return|const|let|var|if|else|for|while|import|export|from|class|extends|public|private|protected|static|use|namespace|fn|def|async|await|try|catch|new|this|self|null|true|false|nil|interface|type|enum|package|struct)$/.test(
                token
              )
            ) {
              return (
                <span key={tokenIdx} className="text-purple-400 dark:text-purple-300 font-semibold">
                  {token}
                </span>
              );
            }

            // Strings
            if (/^["'`]/.test(token)) {
              return (
                <span key={tokenIdx} className="text-emerald-400 dark:text-emerald-300">
                  {token}
                </span>
              );
            }

            // Numbers
            if (/^\d+$/.test(token)) {
              return (
                <span key={tokenIdx} className="text-amber-400 dark:text-amber-300">
                  {token}
                </span>
              );
            }

            // Operators & Punctuation
            if (/^[{}()[\].,:;=+\-*/<>!&|%]$/.test(token)) {
              return (
                <span key={tokenIdx} className="text-cyan-400 dark:text-cyan-300">
                  {token}
                </span>
              );
            }

            // Standard identifiers / text
            return <span key={tokenIdx} className="text-zinc-200">{token}</span>;
          })}
        </span>
      </div>
    );
  });
}

export default function CodeBlock({ language = "text", code, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const cleanLang = (language || "code").trim().toLowerCase();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard fallback
    }
  };

  return (
    <div
      className={cn(
        "my-6 rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] text-zinc-100 shadow-xl font-mono text-left",
        className
      )}
      dir="ltr"
    >
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-zinc-800 text-xs select-none">
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="size-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="size-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="size-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Code2 className="size-3.5 text-primary" />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-300">
            {cleanLang}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer border border-zinc-700/50"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed">
        <div className="table w-full border-collapse">
          {highlightSyntax(code, cleanLang)}
        </div>
      </div>
    </div>
  );
}

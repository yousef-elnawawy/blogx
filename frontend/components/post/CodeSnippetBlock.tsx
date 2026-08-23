"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal, Code2 } from "lucide-react";
import { toast } from "sonner";

interface CodeSnippetBlockProps {
  code: string;
  language?: string;
}

const CODE_FONT_STYLE = {
  fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Consolas, Menlo, Monaco, monospace",
};

// Lightweight, resilient regex tokenizer for syntax highlighting
function highlightCode(rawCode: string, lang: string): React.ReactNode[] {
  const lines = rawCode.split("\n");

  return lines.map((line, lineIdx) => {
    // 1. Full line comment
    if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("/*")) {
      return (
        <div key={lineIdx} className="table-row leading-[1.75]" style={CODE_FONT_STYLE}>
          <span className="table-cell pr-4 text-right select-none text-zinc-600 text-[11px] w-8">
            {lineIdx + 1}
          </span>
          <span className="table-cell text-zinc-500 italic whitespace-pre">{line}</span>
        </div>
      );
    }

    // 2. Terminal CLI command line
    if (line.trim().startsWith("$") || line.trim().startsWith(">") || lang === "bash" || lang === "terminal") {
      const tokens = line.split(/(\$|\s+|-[a-zA-Z0-9-]+|--[a-zA-Z0-9-]+|"[^"]*"|'[^']*')/g);
      return (
        <div key={lineIdx} className="table-row leading-[1.75]" style={CODE_FONT_STYLE}>
          <span className="table-cell pr-4 text-right select-none text-zinc-600 text-[11px] w-8">
            {lineIdx + 1}
          </span>
          <span className="table-cell whitespace-pre">
            {tokens.map((token, tIdx) => {
              if (token === "$" || token === ">") {
                return <span key={tIdx} className="text-emerald-400 font-bold">{token}</span>;
              }
              if (token.startsWith("-")) {
                return <span key={tIdx} className="text-amber-400 font-semibold">{token}</span>;
              }
              if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
                return <span key={tIdx} className="text-emerald-300">{token}</span>;
              }
              if (["npm", "npx", "php", "composer", "git", "yarn", "pnpm", "docker", "artisan", "cargo", "go"].includes(token)) {
                return <span key={tIdx} className="text-cyan-400 font-bold">{token}</span>;
              }
              if (["run", "install", "add", "dev", "build", "start", "serve", "clone", "commit", "push", "pull", "make:"].some(k => token.includes(k))) {
                return <span key={tIdx} className="text-amber-300 font-semibold">{token}</span>;
              }
              return <span key={tIdx} className="text-zinc-200">{token}</span>;
            })}
          </span>
        </div>
      );
    }

    // 3. General Programming Languages (JS/TS/PHP/Python/Go/HTML/CSS)
    const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*$|\b(?:const|let|var|function|return|if|else|import|export|from|class|extends|public|private|protected|async|await|new|try|catch|finally|throw|typeof|instanceof|switch|case|default|break|continue|def|fn|struct|enum|interface|type|implements|package|namespace|use|as|static|void|echo|print)\b|\b(?:true|false|null|undefined|NaN|self|this)\b|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()|[a-zA-Z_$][a-zA-Z0-9_$]*|\S)/g;

    const parts = line.match(tokenRegex) || [line];

    return (
      <div key={lineIdx} className="table-row leading-[1.75]" style={CODE_FONT_STYLE}>
        <span className="table-cell pr-4 text-right select-none text-zinc-600 text-[11px] w-8">
          {lineIdx + 1}
        </span>
        <span className="table-cell whitespace-pre">
          {parts.map((part, pIdx) => {
            // Strings
            if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'")) || (part.startsWith("`") && part.endsWith("`"))) {
              return <span key={pIdx} className="text-emerald-400">{part}</span>;
            }
            // Comments
            if (part.startsWith("//") || part.startsWith("/*") || part.startsWith("#")) {
              return <span key={pIdx} className="text-zinc-500 italic">{part}</span>;
            }
            // Keywords
            if (/^(?:const|let|var|function|return|if|else|import|export|from|class|extends|public|private|protected|async|await|new|try|catch|finally|throw|typeof|instanceof|switch|case|default|break|continue|def|fn|struct|enum|interface|type|implements|package|namespace|use|as|static|void|echo|print)$/.test(part)) {
              return <span key={pIdx} className="text-purple-400 font-semibold">{part}</span>;
            }
            // Booleans & Null
            if (/^(?:true|false|null|undefined|NaN|self|this)$/.test(part)) {
              return <span key={pIdx} className="text-rose-400 font-bold">{part}</span>;
            }
            // Numbers
            if (/^\d+(?:\.\d+)?$/.test(part)) {
              return <span key={pIdx} className="text-amber-400">{part}</span>;
            }
            // Methods / Function names
            if (line.includes(`${part}(`)) {
              return <span key={pIdx} className="text-sky-400 font-medium">{part}</span>;
            }
            // Tags or Special variables
            if (part.startsWith("<") || part.startsWith("</") || part.endsWith(">")) {
              return <span key={pIdx} className="text-cyan-400 font-bold">{part}</span>;
            }
            return <span key={pIdx} className="text-zinc-200">{part}</span>;
          })}
        </span>
      </div>
    );
  });
}

export default function CodeSnippetBlock({
  code,
  language = "code",
}: CodeSnippetBlockProps) {
  const [copied, setCopied] = useState(false);

  const cleanCode = code ? code.trim() : "";

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const isTerminal =
    language.toLowerCase() === "bash" ||
    language.toLowerCase() === "sh" ||
    language.toLowerCase() === "shell" ||
    language.toLowerCase() === "terminal" ||
    language.toLowerCase() === "cmd" ||
    cleanCode.startsWith("$") ||
    cleanCode.startsWith("npm ") ||
    cleanCode.startsWith("npx ") ||
    cleanCode.startsWith("php ") ||
    cleanCode.startsWith("composer ");

  const displayLang = language && language !== "code" ? language.toUpperCase() : isTerminal ? "TERMINAL" : "CODE";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={CODE_FONT_STYLE}
      className="my-3 rounded-2xl border border-zinc-800 bg-[#0d1117] text-zinc-100 overflow-hidden shadow-xl text-xs sm:text-[13.5px] select-text transition-all"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#161b22] border-b border-zinc-800 text-[11px] text-zinc-400 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-[#ff5f56]" />
            <div className="size-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="size-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="flex items-center gap-1 font-semibold text-zinc-300 ml-1">
            {isTerminal ? <Terminal className="size-3 text-emerald-400" /> : <Code2 className="size-3 text-sky-400" />}
            <span>{displayLang}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px] font-sans font-medium active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax Highlighted Code Body */}
      <div className="p-4 overflow-x-auto no-scrollbar max-h-96" style={CODE_FONT_STYLE}>
        <div className="table w-full" style={CODE_FONT_STYLE}>
          {highlightCode(cleanCode, language.toLowerCase())}
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  GitBranch, 
  Shield, 
  Send, 
  ChevronRight, 
  Activity,
  Layers,
  Command,
  Zap,
  Code,
  Search,
  FileCode,
  Terminal as TerminalIcon,
  Brain,
  Eye,
  Network,
  Globe,
  Lock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as prettier from 'prettier/standalone';
import prettierPluginBabel from 'prettier/plugins/babel';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginTypescript from 'prettier/plugins/typescript';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface GitExample {
  label: string;
  cmd: string;
}

interface GitCommand {
  command: string;
  description: string;
  details: string;
  examples: GitExample[];
}

const GIT_COMMANDS: GitCommand[] = [
  { 
    command: 'git init', 
    description: 'Initialize a local Git repository.', 
    details: 'This command creates a new .git subdirectory in your current directory, which contains all of your necessary repository files — a Git repository skeleton.',
    examples: [
      { label: 'Basic initialization', cmd: 'git init' },
      { label: 'Initialize with specific branch name', cmd: 'git init -b main' }
    ]
  },
  { 
    command: 'git clone', 
    description: 'Create a copy of a remote repository.', 
    details: 'Clones a repository into a newly created directory, creates remote-tracking branches for each branch in the cloned repository, and creates and checks out an initial branch that is forked from the cloned repository’s currently active branch.',
    examples: [
      { label: 'Clone via HTTPS', cmd: 'git clone https://github.com/user/repo.git' },
      { label: 'Clone to a specific directory', cmd: 'git clone <url> my-project' },
      { label: 'Clone a specific branch', cmd: 'git clone -b <branch> <url>' }
    ]
  },
  { 
    command: 'git add', 
    description: 'Add file contents to the staging area.', 
    details: 'This command updates the index using the current content found in the working tree, to prepare the content staged for the next commit.',
    examples: [
      { label: 'Add a single file', cmd: 'git add index.html' },
      { label: 'Add all changes in current directory', cmd: 'git add .' },
      { label: 'Interactive staging', cmd: 'git add -p' }
    ]
  },
  { 
    command: 'git commit', 
    description: 'Record changes to the repository.', 
    details: 'Create a new commit containing the current contents of the index and the given log message describing the changes.',
    examples: [
      { label: 'Commit with message', cmd: 'git commit -m "feat: add core logic"' },
      { label: 'Stage and commit all tracked files', cmd: 'git commit -am "fix: resolve bug"' },
      { label: 'Amend the last commit', cmd: 'git commit --amend' }
    ]
  },
  { 
    command: 'git status', 
    description: 'Show the working tree status.', 
    details: 'Displays paths that have differences between the index file and the current HEAD commit, paths that have differences between the working tree and the index file, and paths in the working tree that are not tracked by Git.',
    examples: [
      { label: 'Check status', cmd: 'git status' },
      { label: 'Short format status', cmd: 'git status -s' }
    ]
  },
  { 
    command: 'git push', 
    description: 'Update remote refs along with associated objects.', 
    details: 'Updates remote refs using local refs, while sending objects necessary to complete the given refs.',
    examples: [
      { label: 'Push to main', cmd: 'git push origin main' },
      { label: 'Force push (use with caution)', cmd: 'git push --force' },
      { label: 'Push all branches', cmd: 'git push --all origin' }
    ]
  },
  { 
    command: 'git pull', 
    description: 'Fetch from and integrate with another repository.', 
    details: 'Incorporates changes from a remote repository into the current branch. In its default mode, git pull is shorthand for git fetch followed by git merge FETCH_HEAD.',
    examples: [
      { label: 'Pull from origin', cmd: 'git pull origin main' },
      { label: 'Pull and rebase', cmd: 'git pull --rebase origin main' }
    ]
  },
  { 
    command: 'git checkout', 
    description: 'Switch branches or restore files.', 
    details: 'Updates files in the working tree to match the version in the index or the specified tree. If no pathspec was given, git checkout will also update HEAD to set the specified branch as the current branch.',
    examples: [
      { label: 'Switch to branch', cmd: 'git checkout dev' },
      { label: 'Create and switch to new branch', cmd: 'git checkout -b feature/ui' },
      { label: 'Restore a single file', cmd: 'git checkout main -- path/to/file' }
    ]
  },
  { 
    command: 'git branch', 
    description: 'List, create, or delete branches.', 
    details: 'If --list is given, or if there are no non-option arguments, existing branches are listed; the current branch will be highlighted with an asterisk.',
    examples: [
      { label: 'List local branches', cmd: 'git branch' },
      { label: 'List all branches (local & remote)', cmd: 'git branch -a' },
      { label: 'Delete a branch', cmd: 'git branch -d <branch>' }
    ]
  },
  { 
    command: 'git merge', 
    description: 'Join development histories together.', 
    details: 'Incorporates changes from the named commits (since the time their histories diverged from the current branch) into the current branch.',
    examples: [
      { label: 'Merge branch into current', cmd: 'git merge feature/login' },
      { label: 'Abort a merge with conflicts', cmd: 'git merge --abort' }
    ]
  },
  { 
    command: 'git log', 
    description: 'Show commit logs and history.', 
    details: 'Displays the commit history of the current branch. It allows you to filter, format, and visualize the progression of changes over time. Essential for auditing changes, finding specific commits, and understanding project evolution.',
    examples: [
      { label: 'Basic commit history', cmd: 'git log' },
      { label: 'Compact one-line summary', cmd: 'git log --oneline' },
      { label: 'Visual graph with branch topology', cmd: 'git log --graph --oneline --all --decorate' },
      { label: 'Show changes introduced in each commit', cmd: 'git log -p' },
      { label: 'Limit to last N commits', cmd: 'git log -n 5' },
      { label: 'Filter by author', cmd: 'git log --author="John Doe"' },
      { label: 'Search commit messages for a string', cmd: 'git log --grep="fix:"' }
    ]
  },
  { 
    command: 'git diff', 
    description: 'Show changes between commits.', 
    details: 'Show changes between the working tree and the index or a tree, changes between the index and a tree, changes between two trees, changes resulting from a merge, changes between two blob objects, or changes between two files on disk.',
    examples: [
      { label: 'Show unstaged changes', cmd: 'git diff' },
      { label: 'Show staged changes', cmd: 'git diff --staged' },
      { label: 'Compare two branches', cmd: 'git diff main..feature' }
    ]
  },
];

// --- Components ---

const CoreStatus = ({ isActive }: { isActive: boolean }) => (
  <div className="flex items-center gap-4 px-4 py-2 border-b border-[#333] bg-[#0a0a0a]">
    <div className="relative">
      <div className={cn(
        "w-3 h-3 rounded-full transition-all duration-500",
        isActive ? "bg-[#00ff41] core-pulse scale-110" : "bg-[#333]"
      )} />
      {isActive && (
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-[#00ff41] rounded-full"
        />
      )}
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-widest text-[#666]">System Status</span>
      <span className={cn(
        "text-xs font-bold uppercase tracking-tighter",
        isActive ? "text-[#00ff41] terminal-glow" : "text-[#e0e0e0]"
      )}>
        {isActive ? "Core Active // Processing" : "Core Standby // Ready"}
      </span>
    </div>
    <div className="ml-auto flex gap-4">
      <div className="flex flex-col items-end">
        <span className="text-[10px] uppercase text-[#666]">Uptime</span>
        <span className="text-xs">04:22:11:09</span>
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[10px] uppercase text-[#666]">Latency</span>
        <span className="text-xs text-[#00ff41]">12ms</span>
      </div>
    </div>
  </div>
);

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2",
      active ? "bg-[#111] border-[#00ff41] text-[#00ff41]" : "border-transparent text-[#666] hover:text-[#e0e0e0] hover:bg-[#0a0a0a]"
    )}
  >
    <Icon size={16} />
    <span className="text-xs uppercase tracking-wider font-medium">{label}</span>
  </div>
);

type View = 'terminal' | 'git-commands' | 'git-analysis' | 'architecture' | 'security' | 'logs' | 'zclaude-code' | 'z-aiclaude-ia';

export default function App() {
  const [activeView, setActiveView] = useState<View>('terminal');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [analysisResult, setAnalysisResult] = useState<{
    complexity: string;
    security: string;
    optimization: string;
    suggestions: string[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const formatCode = async (code: string) => {
    if (!code.trim()) return code;
    try {
      setIsFormatting(true);
      const formatted = await prettier.format(code, {
        parser: "typescript",
        plugins: [prettierPluginBabel, prettierPluginEstree, prettierPluginTypescript],
        semi: true,
        singleQuote: true,
        printWidth: 80,
      });
      return formatted;
    } catch (error) {
      console.error("Formatting error:", error);
      return code;
    } finally {
      setIsFormatting(false);
    }
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: 'SYSTEM INITIALIZED. gitZ-CORE ONLINE. STANDING BY FOR TECHNICAL INPUT.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (activeView === 'terminal') {
      scrollToBottom();
    }
  }, [messages, activeView]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const chat = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction: "You are gitZ-CORE, a high-level technical AI assistant. Personality: precise, efficient, brutalist. Specialize in Git, architecture, and debugging. Use monospace for code. Be direct.",
        }
      });

      const result = await chat.sendMessage({ message: input });
      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result.text || "ERROR: EMPTY_RESPONSE_RECEIVED",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "CRITICAL ERROR: CONNECTION_FAILURE. CHECK SYSTEM LOGS.",
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#333] bg-[#050505] flex flex-col">
        <div className="p-6 border-b border-[#333] flex items-center gap-3">
          <div className="p-2 bg-[#00ff41] text-black">
            <Cpu size={20} />
          </div>
          <h1 className="text-lg font-black tracking-tighter uppercase italic">gitZ-CORE</h1>
        </div>
        
        <nav className="flex-1 py-4">
          <SidebarItem icon={Terminal} label="Terminal" active={activeView === 'terminal'} onClick={() => setActiveView('terminal')} />
          <SidebarItem icon={Brain} label="Z-AICLAUDE.ia" active={activeView === 'z-aiclaude-ia'} onClick={() => setActiveView('z-aiclaude-ia')} />
          <SidebarItem icon={Code} label="zclaude.code" active={activeView === 'zclaude-code'} onClick={() => setActiveView('zclaude-code')} />
          <SidebarItem icon={Command} label="Git Commands" active={activeView === 'git-commands'} onClick={() => setActiveView('git-commands')} />
          <SidebarItem icon={GitBranch} label="Git Analysis" active={activeView === 'git-analysis'} onClick={() => setActiveView('git-analysis')} />
          <SidebarItem icon={Layers} label="Architecture" active={activeView === 'architecture'} onClick={() => setActiveView('architecture')} />
          <SidebarItem icon={Shield} label="Security Audit" active={activeView === 'security'} onClick={() => setActiveView('security')} />
          <SidebarItem icon={Activity} label="System Logs" active={activeView === 'logs'} onClick={() => setActiveView('logs')} />
        </nav>

        <div className="p-4 border-t border-[#333]">
          <div className="p-4 bg-[#111] border border-[#222] rounded-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-[#00ff41]" />
              <span className="text-[10px] uppercase font-bold text-[#666]">Energy Consumption</span>
            </div>
            <div className="h-1 w-full bg-[#222] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                className="h-full bg-[#00ff41]"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-[#050505]/50">
        <CoreStatus isActive={isProcessing} />

        {activeView === 'terminal' ? (
          <>
            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
            >
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-6 max-w-4xl mx-auto",
                      msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 shrink-0 flex items-center justify-center border",
                      msg.role === 'user' ? "bg-[#e0e0e0] text-black border-[#e0e0e0]" : "bg-[#0a0a0a] text-[#00ff41] border-[#333]"
                    )}>
                      {msg.role === 'user' ? <Command size={18} /> : <Cpu size={18} />}
                    </div>
                    
                    <div className={cn(
                      "flex-1 space-y-2",
                      msg.role === 'user' ? "text-right" : "text-left"
                    )}>
                      <div className="flex items-center gap-3 mb-1 opacity-50">
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {msg.role === 'user' ? "Operator" : "gitZ-CORE"}
                        </span>
                        <span className="text-[10px]">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "p-5 rounded-sm border leading-relaxed text-sm",
                        msg.role === 'user' 
                          ? "bg-[#111] border-[#333] text-[#e0e0e0]" 
                          : "bg-[#0a0a0a] border-[#222] text-[#e0e0e0]"
                      )}>
                        <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#333] prose-code:text-[#00ff41]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isProcessing && (
                <div className="flex gap-6 max-w-4xl mx-auto">
                  <div className="w-10 h-10 shrink-0 flex items-center justify-center border bg-[#0a0a0a] text-[#00ff41] border-[#333]">
                    <Cpu size={18} className="animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 text-[#666]">
                    <span className="text-[10px] uppercase tracking-widest animate-pulse">Analyzing Data Stream...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-8 border-t border-[#333] bg-[#0a0a0a]">
              <div className="max-w-4xl mx-auto relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666]">
                  <ChevronRight size={18} />
                </div>
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="INPUT COMMAND OR QUERY..."
                  className="w-full bg-[#050505] border border-[#333] py-4 pl-12 pr-16 text-sm focus:outline-none focus:border-[#00ff41] transition-colors placeholder:text-[#333] uppercase tracking-wider"
                />
                <button 
                  onClick={handleSend}
                  disabled={isProcessing || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#00ff41] text-black hover:bg-[#00cc33] disabled:bg-[#333] disabled:text-[#666] transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="max-w-4xl mx-auto mt-4 flex justify-between text-[10px] text-[#444] uppercase font-bold">
                <span>Protocol: SECURE_ENCRYPTED_V3</span>
                <span>Auth: GFBLEU_ADMIN_LEVEL_5</span>
                <span>Region: US-EAST-1_CORE</span>
              </div>
            </div>
          </>
        ) : activeView === 'zclaude-code' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-[#333] bg-[#0a0a0a]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00ff41] text-black">
                  <FileCode size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase italic">zclaude.code</h2>
                  <p className="text-[10px] text-[#666] uppercase tracking-widest">Advanced Code Analysis Engine</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={async () => {
                    const formatted = await formatCode(codeSnippet);
                    setCodeSnippet(formatted);
                  }}
                  disabled={isFormatting || !codeSnippet.trim()}
                  className="px-4 py-2 border border-[#333] text-[#e0e0e0] text-[10px] font-bold uppercase tracking-widest hover:bg-[#111] disabled:bg-[#333] transition-all flex items-center gap-2"
                >
                  {isFormatting ? <Activity size={12} className="animate-spin" /> : <Zap size={12} />}
                  {isFormatting ? "Formatting..." : "Format Code"}
                </button>
                <button 
                  onClick={async () => {
                    if (!codeSnippet.trim() || isAnalyzing) return;
                    setIsAnalyzing(true);
                    try {
                      const formatted = await formatCode(codeSnippet);
                      setCodeSnippet(formatted);
                      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
                      const response = await ai.models.generateContent({
                        model: "gemini-3.1-flash-lite-preview",
                        contents: `Analyze this code and provide metrics in JSON format: { "complexity": "string", "security": "string", "optimization": "string", "suggestions": ["string"] }. Code: ${formatted}`,
                        config: { responseMimeType: "application/json" }
                      });
                      const data = JSON.parse(response.text || "{}");
                      setAnalysisResult(data);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={isAnalyzing || !codeSnippet.trim()}
                  className="px-6 py-2 bg-[#00ff41] text-black text-xs font-bold uppercase tracking-widest hover:bg-[#00cc33] disabled:bg-[#333] transition-all flex items-center gap-2"
                >
                  {isAnalyzing ? <Activity size={14} className="animate-spin" /> : <Search size={14} />}
                  {isAnalyzing ? "Analyzing..." : "Run Analysis"}
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Code Editor Area */}
              <div className="flex-1 p-8 border-r border-[#333] bg-[#050505]">
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-[10px] text-[#444] uppercase font-bold tracking-widest">
                    <TerminalIcon size={12} />
                    <span>Source Input</span>
                  </div>
                  <textarea 
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    placeholder="// PASTE CODE SNIPPET HERE FOR DEEP ANALYSIS..."
                    className="flex-1 bg-[#0a0a0a] border border-[#222] p-6 text-sm font-mono text-[#e0e0e0] focus:outline-none focus:border-[#00ff41] transition-colors resize-none placeholder:text-[#222]"
                  />
                </div>
              </div>

              {/* Analysis Results Area */}
              <div className="w-96 p-8 bg-[#0a0a0a] overflow-y-auto">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-[10px] uppercase font-bold text-[#444] mb-4 tracking-[0.2em]">Core Metrics</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Complexity', value: analysisResult?.complexity || 'N/A', color: 'text-[#00ff41]' },
                        { label: 'Security', value: analysisResult?.security || 'N/A', color: 'text-orange-500' },
                        { label: 'Optimization', value: analysisResult?.optimization || 'N/A', color: 'text-blue-500' },
                      ].map((metric) => (
                        <div key={metric.label} className="p-4 bg-[#050505] border border-[#222]">
                          <div className="text-[10px] text-[#666] uppercase mb-1">{metric.label}</div>
                          <div className={cn("text-sm font-bold uppercase tracking-tighter", metric.color)}>
                            {metric.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] uppercase font-bold text-[#444] mb-4 tracking-[0.2em]">Z-CORE Suggestions</h3>
                    <div className="space-y-2">
                      {analysisResult?.suggestions ? (
                        analysisResult.suggestions.map((s, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-3 bg-[#111] border-l-2 border-[#00ff41] text-[11px] leading-relaxed text-[#999]"
                          >
                            {s}
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-[10px] text-[#333] italic">Awaiting input for analysis...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeView === 'z-aiclaude-ia' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-[#333] bg-[#0a0a0a]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00ff41] text-black">
                  <Brain size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase italic">Z-AICLAUDE.ia</h2>
                  <p className="text-[10px] text-[#666] uppercase tracking-widest">Internal Intelligence Agency // Neural Core</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-[#444] font-bold">Synaptic Load</span>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className={cn("w-2 h-3", i <= 6 ? "bg-[#00ff41]" : "bg-[#222]")} />
                    ))}
                  </div>
                </div>
                <div className="h-10 w-px bg-[#333]" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-[#444] font-bold">Cognitive Depth</span>
                  <span className="text-sm font-bold text-[#00ff41]">98.4%</span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Neural Visualization */}
              <div className="flex-1 p-8 border-r border-[#333] bg-[#050505] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-[10px] text-[#444] uppercase font-bold tracking-widest">
                    <Network size={12} />
                    <span>Neural Activity Monitor</span>
                  </div>
                  <div className="text-[10px] text-[#00ff41] animate-pulse">LIVE_FEED_ACTIVE</div>
                </div>
                
                <div className="flex-1 grid grid-cols-12 gap-2 p-4 bg-[#0a0a0a] border border-[#222] overflow-hidden">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        opacity: [0.1, Math.random() > 0.8 ? 0.8 : 0.1, 0.1],
                        scale: [1, Math.random() > 0.9 ? 1.2 : 1, 1]
                      }}
                      transition={{ 
                        duration: 2 + Math.random() * 3, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="aspect-square bg-[#00ff41]/20 rounded-full"
                    />
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  {[
                    { label: 'Global Nodes', value: '14,229', icon: Globe },
                    { label: 'Secure Links', value: '842', icon: Lock },
                    { label: 'Active Threads', value: '128', icon: Activity },
                  ].map((stat) => (
                    <div key={stat.label} className="p-4 bg-[#0a0a0a] border border-[#222]">
                      <div className="flex items-center gap-2 mb-2 text-[#444]">
                        <stat.icon size={12} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">{stat.label}</span>
                      </div>
                      <div className="text-lg font-bold text-[#e0e0e0]">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel: Intelligence Queries */}
              <div className="w-96 p-8 bg-[#0a0a0a] flex flex-col">
                <div className="flex items-center gap-2 mb-6 text-[10px] text-[#444] uppercase font-bold tracking-widest">
                  <Eye size={12} />
                  <span>Intelligence Queries</span>
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2">
                  <div className="p-4 bg-[#050505] border border-[#222] text-[11px] leading-relaxed">
                    <span className="text-[#00ff41] font-bold mr-2">Z-CORE:</span>
                    Awaiting strategic intelligence request. Neural core is primed for high-level analysis.
                  </div>
                  <div className="p-4 bg-[#111] border border-[#222] text-[11px] leading-relaxed italic text-[#666]">
                    Tip: Use Z-AICLAUDE.ia for system-wide optimization strategies and security threat modeling.
                  </div>
                </div>

                <div className="relative">
                  <textarea 
                    placeholder="ENTER STRATEGIC QUERY..."
                    className="w-full bg-[#050505] border border-[#333] p-4 text-xs font-mono text-[#e0e0e0] focus:outline-none focus:border-[#00ff41] transition-colors resize-none h-24 placeholder:text-[#222] uppercase tracking-wider"
                  />
                  <button className="absolute bottom-2 right-2 p-2 bg-[#00ff41] text-black hover:bg-[#00cc33] transition-colors">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeView === 'git-commands' ? (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-[#00ff41] text-black">
                  <Command size={20} />
                </div>
                <h2 className="text-xl font-black tracking-tighter uppercase italic">Git Command Reference</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {GIT_COMMANDS.map((cmd, idx) => (
                  <motion.div 
                    key={cmd.command}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-6 bg-[#0a0a0a] border border-[#222] hover:border-[#00ff41] transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <code className="text-[#00ff41] font-bold text-lg tracking-tight group-hover:terminal-glow transition-all">
                          {cmd.command}
                        </code>
                        <span className="text-xs text-[#666] uppercase tracking-widest mt-1">{cmd.description}</span>
                      </div>
                      <span className="text-[10px] text-[#444] font-mono">0x{idx.toString(16).padStart(2, '0')}</span>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="text-[10px] uppercase font-bold text-[#444] mb-2 tracking-[0.2em]">Detailed Analysis</h4>
                      <p className="text-xs text-[#999] leading-relaxed">
                        {cmd.details}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] uppercase font-bold text-[#444] mb-2 tracking-[0.2em]">Common Use Cases</h4>
                      {cmd.examples.map((example, eIdx) => (
                        <div key={eIdx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-[#00ff41] rounded-full" />
                            <span className="text-[10px] text-[#666] uppercase font-medium">{example.label}</span>
                          </div>
                          <div className="p-3 bg-[#050505] border border-[#111] font-mono text-[10px] text-[#e0e0e0] flex items-center">
                            <span className="text-[#444] mr-2">$</span>
                            {example.cmd}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#333]">
            <div className="text-center">
              <Cpu size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-xs uppercase tracking-[0.2em] font-bold">Module Under Construction</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

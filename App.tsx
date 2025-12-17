
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Send, 
  Settings, 
  FileText, 
  Layers, 
  Link as LinkIcon, 
  Zap, 
  Cpu, 
  MoreVertical,
  Maximize2,
  ChevronRight,
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  MessageSquare, 
  History, 
  Info, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  Search, 
  Terminal, 
  Activity, 
  ArrowLeft, 
  Clock, 
  RotateCcw, 
  XCircle, 
  ShieldCheck, 
  Server,
  ToyBrick,
  Box
} from 'lucide-react';
import { MCPStatus, StoryPart, FigmaFrame, Collaborator, RemoteCursor, FigmaFile, Version, MCPLogEntry, MCPLogSeverity } from './types';
import { geminiService } from './services/geminiService';
import { Icons, FIGMA_COLORS } from './constants';

const COLLABORATORS: Collaborator[] = [
  { id: 'u1', name: 'Sarah (Design)', color: '#F24E1E', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', isOnline: true },
  { id: 'u2', name: 'Mike (Dev)', color: '#A259FF', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', isOnline: true },
  { id: 'u3', name: 'Alex (PM)', color: '#0ACF83', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', isOnline: false },
];

const INITIAL_CONTENT = '# Product Specification: User Onboarding\n\n## Overview\nThis document outlines the technical requirements for the new user onboarding flow...\n\n## Technical Constraints\n- Must use MCP server for auth validation\n- Figma designs version 2.4 strictly followed';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'chat' | 'editor'>('editor');
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<StoryPart[]>([]);
  const [input, setInput] = useState('');
  const [docContent, setDocContent] = useState(INITIAL_CONTENT);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Versions State
  const [versions, setVersions] = useState<Version[]>([
    { 
      id: 'v1', 
      content: INITIAL_CONTENT, 
      timestamp: Date.now() - 3600000, 
      authorName: 'Alex (PM)', 
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      label: 'Initial Draft'
    }
  ]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Enhanced MCP State
  const [mcpStatus, setMcpStatus] = useState<MCPStatus>(MCPStatus.DISCONNECTED);
  const [mcpMessage, setMcpMessage] = useState('Local MCP server inactive');
  const [mcpLogs, setMcpLogs] = useState<MCPLogEntry[]>([]);
  const [mcpProgress, setMcpProgress] = useState(0);
  
  // Figma State
  const [figmaUrl, setFigmaUrl] = useState('');
  const [isFetchingFigma, setIsFetchingFigma] = useState(false);
  const [figmaFile, setFigmaFile] = useState<FigmaFile | null>(null);
  const [availableFrames, setAvailableFrames] = useState<FigmaFrame[]>([]);
  const [linkedFrames, setLinkedFrames] = useState<FigmaFrame[]>([]);
  const [showFigmaLinkModal, setShowFigmaLinkModal] = useState(false);

  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<any>(null);

  const addMcpLog = useCallback((message: string, severity: MCPLogSeverity = 'info') => {
    setMcpLogs(prev => [
      { id: Date.now().toString() + Math.random(), message, timestamp: Date.now(), severity },
      ...prev
    ]);
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (docContent !== versions[0]?.content) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveNewVersion();
      }, 5000);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [docContent]);

  const saveNewVersion = useCallback((label?: string) => {
    const newVersion: Version = {
      id: `v-${Date.now()}`,
      content: docContent,
      timestamp: Date.now(),
      authorName: 'Mike (Dev)',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      label: label || 'Auto-save'
    };
    setVersions(prev => [newVersion, ...prev]);
  }, [docContent]);

  const revertToVersion = (version: Version) => {
    setDocContent(version.content);
    setSelectedVersionId(null);
    setShowHistory(false);
    saveNewVersion(`Restored to ${new Date(version.timestamp).toLocaleTimeString()}`);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (viewMode === 'editor') {
        const sarahPos = { userId: 'u1', userName: 'Sarah', color: '#F24E1E', x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 };
        const mikePos = { userId: 'u2', userName: 'Mike', color: '#A259FF', x: 400 + Math.random() * 200, y: 300 + Math.random() * 100 };
        setCursors([sarahPos, mikePos]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [viewMode]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating) return;
    const userMessage: StoryPart = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    try {
      const historyItems = messages.map(m => ({ role: m.role, content: m.content }));
      const systemInstruction = `You are StoryForge AI. Current Content: ${docContent}`;
      const result = await geminiService.generateStory(input, historyItems, systemInstruction);
      const assistantMessage: StoryPart = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.text || 'Document updated.', timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchFigmaFrames = async () => {
    if (!figmaUrl) return;
    setIsFetchingFigma(true);
    setTimeout(() => {
      const mockFile: FigmaFile = { key: 'abc123figma', name: 'Mobile App V2', lastModified: new Date().toISOString(), thumbnailUrl: 'https://picsum.photos/seed/figmafile/400/200' };
      const mockFrames: FigmaFrame[] = [{ id: 'f1', name: 'Login Screen', thumbnail: 'https://picsum.photos/seed/login/400/300', description: 'User login.' }];
      setFigmaFile(mockFile);
      setAvailableFrames(mockFrames);
      setIsFetchingFigma(false);
      setShowFigmaLinkModal(true);
    }, 1200);
  };

  const linkFrame = (frame: FigmaFrame) => {
    if (linkedFrames.find(f => f.id === frame.id)) return;
    setLinkedFrames([...linkedFrames, { ...frame, linkedAt: Date.now() }]);
  };

  const unlinkFrame = (frameId: string) => setLinkedFrames(linkedFrames.filter(f => f.id !== frameId));

  // Granular MCP Connection Logic
  const connectMCP = () => {
    setMcpStatus(MCPStatus.CONNECTING);
    setMcpProgress(10);
    setMcpMessage('Initializing JSON-RPC interface...');
    addMcpLog('Starting Model Context Protocol (MCP) client...');
    
    setTimeout(() => {
      setMcpProgress(30);
      setMcpMessage('Locating local server on port 8080...');
      addMcpLog('Attempting to bind to localhost:8080', 'info');
    }, 600);

    setTimeout(() => {
      setMcpProgress(50);
      setMcpMessage('Handshaking with dev-stack-v1...');
      addMcpLog('Server found: dev-stack-v1 (ver 1.4.2)', 'success');
      addMcpLog('Negotiating protocol version 2024.11.05...', 'info');
    }, 1500);

    setTimeout(() => {
      setMcpProgress(75);
      setMcpMessage('Authenticating session...');
      addMcpLog('Session identity verified: developer_mike', 'success');
      addMcpLog('Listing available tools and resources...', 'info');
    }, 2800);

    setTimeout(() => {
      setMcpProgress(100);
      setMcpStatus(MCPStatus.CONNECTED);
      setMcpMessage('Connected & ready');
      addMcpLog('Successfully indexed 12 tools and 4 resource templates', 'success');
      addMcpLog('MCP Bridge active', 'success');
    }, 4000);
  };

  const disconnectMCP = () => {
    setMcpStatus(MCPStatus.DISCONNECTED);
    setMcpMessage('Local MCP server inactive');
    setMcpProgress(0);
    addMcpLog('Session terminated by user', 'warn');
  };

  const triggerMcpError = () => {
    setMcpStatus(MCPStatus.ERROR);
    setMcpMessage('Protocol timeout');
    setMcpProgress(0);
    addMcpLog('Connection refused: Port 8080 is blocked or server is offline', 'error');
    addMcpLog('Handshake failed at stage: SOCKET_BIND', 'error');
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const previewVersion = versions.find(v => v.id === selectedVersionId);

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 flex-shrink-0 border-r border-slate-800 flex flex-col items-center py-6 bg-[#0b1120] gap-8">
        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col gap-6">
          <button onClick={() => { setViewMode('editor'); setShowHistory(false); }} className={`p-2 rounded-lg transition-colors ${viewMode === 'editor' && !showHistory ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <FileText className="w-6 h-6" />
          </button>
          <button onClick={() => { setViewMode('chat'); setShowHistory(false); }} className={`p-2 rounded-lg transition-colors ${viewMode === 'chat' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <MessageSquare className="w-6 h-6" />
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-amber-500/10 text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}>
            <History className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-auto pb-4">
          <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
        {/* Collaborative Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-slate-800 rounded"><FileText className="w-4 h-4 text-indigo-400" /></div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Onboarding Spec 2025</h2>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] text-slate-500 font-medium">Synced • Sarah & Mike are editing</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {COLLABORATORS.filter(c => c.isOnline).map(c => (
                <div key={c.id} className="relative group cursor-help">
                  <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 transition-transform hover:scale-110" style={{ borderColor: c.color }} />
                </div>
              ))}
            </div>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-lg hover:bg-indigo-600/20 transition-all">
              <Users className="w-3.5 h-3.5" /> Collaborate
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex">
          {viewMode === 'editor' ? (
            <div className="flex-1 flex flex-col relative bg-[#0b0f1a]">
              {selectedVersionId && previewVersion && (
                <div className="absolute top-0 left-0 right-0 h-12 bg-amber-500 text-slate-950 flex items-center justify-between px-6 z-30 font-bold text-sm">
                  <div className="flex items-center gap-3"><Clock className="w-4 h-4" /><span>Version: {new Date(previewVersion.timestamp).toLocaleString()}</span></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedVersionId(null)} className="px-3 py-1 bg-slate-900/10 hover:bg-slate-900/20 rounded border border-slate-900/20 transition-all">Exit</button>
                    <button onClick={() => revertToVersion(previewVersion)} className="px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 transition-all flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5" />Restore</button>
                  </div>
                </div>
              )}
              <div className={`flex-1 overflow-y-auto p-12 lg:p-20 relative ${selectedVersionId ? 'mt-12' : ''}`}>
                <div className="max-w-3xl mx-auto min-h-full bg-slate-900/40 rounded-2xl border border-slate-800/50 p-10 shadow-2xl relative">
                  <textarea 
                    ref={editorRef}
                    value={selectedVersionId ? (previewVersion?.content || '') : docContent}
                    onChange={(e) => !selectedVersionId && setDocContent(e.target.value)}
                    readOnly={!!selectedVersionId}
                    spellCheck={false}
                    className={`w-full h-full bg-transparent border-none focus:ring-0 text-slate-300 font-mono text-sm leading-relaxed resize-none p-0 ${selectedVersionId ? 'opacity-60 cursor-default' : ''}`}
                    placeholder="Start drafting..."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col relative">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-800/50 border border-slate-700 text-slate-200'}`}>
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6">
                <div className="max-w-4xl mx-auto flex items-end gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl">
                  <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask AI..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm" />
                  <button onClick={handleSendMessage} className="p-2 bg-indigo-600 text-white rounded-lg"><Send className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Context Panel - Right Side */}
          <div className="w-80 border-l border-slate-800 flex flex-col bg-[#0b1120] hidden xl:flex">
             {showHistory ? (
                <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2"><History className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-bold uppercase tracking-wider">History</span></div>
                    <button onClick={() => { setShowHistory(false); setSelectedVersionId(null); }} className="p-1 hover:bg-slate-800 rounded text-slate-500"><Plus className="w-4 h-4 rotate-45" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {versions.map((v) => (
                      <div key={v.id} onClick={() => setSelectedVersionId(v.id)} className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedVersionId === v.id ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'}`}>
                        <div className="flex items-start gap-3">
                          <img src={v.authorAvatar} alt={v.authorName} className="w-6 h-6 rounded-full bg-slate-800" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5"><p className="text-[10px] font-bold text-slate-200 truncate">{v.authorName}</p><span className="text-[9px] text-slate-500 whitespace-nowrap">{formatTime(v.timestamp)}</span></div>
                            <p className="text-[11px] text-slate-400 font-medium">{v.label}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             ) : (
                <>
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-slate-500" /><span className="text-[10px] font-bold uppercase tracking-wider">Context Assets</span></div>
                    <button onClick={() => setShowFigmaLinkModal(true)} className="p-1 hover:bg-slate-800 rounded text-indigo-400"><Plus className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-6">
                      {/* Figma Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4"><div className="w-4 h-4"><Icons.Figma /></div><span className="text-xs font-bold">Figma Designs</span></div>
                        {linkedFrames.length === 0 ? (
                          <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center"><LinkIcon className="w-6 h-6 text-slate-600 mx-auto mb-2" /><p className="text-[10px] text-slate-500 mb-4">No frames linked.</p></div>
                        ) : (
                          <div className="space-y-3">
                            {linkedFrames.map(frame => (
                              <div key={frame.id} className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 hover:border-indigo-500/50 transition-all">
                                <img src={frame.thumbnail} alt={frame.name} className="w-full h-24 object-cover opacity-60" />
                                <div className="absolute bottom-2 left-3"><p className="text-[10px] font-bold text-white">{frame.name}</p></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Granular & Advanced MCP Panel */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-amber-500">
                            <ToyBrick className="w-4 h-4" />
                            <span className="text-xs font-bold text-slate-200">MCP Toolchain</span>
                          </div>
                          {mcpStatus === MCPStatus.CONNECTED && (
                            <button onClick={disconnectMCP} className="text-[8px] uppercase tracking-tighter text-slate-500 hover:text-rose-400 transition-colors font-bold flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> Terminate
                            </button>
                          )}
                        </div>

                        <div className={`p-4 rounded-xl border transition-all duration-500 ${
                          mcpStatus === MCPStatus.CONNECTED ? 'border-emerald-500/30 bg-emerald-500/5 shadow-lg shadow-emerald-500/5' : 
                          mcpStatus === MCPStatus.CONNECTING ? 'border-amber-500/30 bg-amber-500/5' : 
                          mcpStatus === MCPStatus.ERROR ? 'border-rose-500/30 bg-rose-500/5' : 
                          'border-slate-800 bg-slate-900/40'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  mcpStatus === MCPStatus.CONNECTED ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 
                                  mcpStatus === MCPStatus.CONNECTING ? 'bg-amber-500 animate-pulse' : 
                                  mcpStatus === MCPStatus.ERROR ? 'bg-rose-500' : 'bg-slate-600'
                                }`}></div>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${
                                  mcpStatus === MCPStatus.CONNECTED ? 'text-emerald-500' :
                                  mcpStatus === MCPStatus.CONNECTING ? 'text-amber-500' :
                                  mcpStatus === MCPStatus.ERROR ? 'text-rose-500' : 'text-slate-500'
                                }`}>
                                  {mcpStatus}
                                </p>
                              </div>
                              <p className="text-xs font-semibold text-slate-300 line-clamp-1">{mcpMessage}</p>
                            </div>
                            <div className="p-1.5 bg-slate-800/50 rounded-lg">
                              {mcpStatus === MCPStatus.CONNECTING ? <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" /> : 
                               mcpStatus === MCPStatus.CONNECTED ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> : 
                               mcpStatus === MCPStatus.ERROR ? <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> : 
                               <Server className="w-3.5 h-3.5 text-slate-700" />}
                            </div>
                          </div>

                          {/* Placeholder Icon when disconnected or idle */}
                          {mcpStatus === MCPStatus.DISCONNECTED && (
                             <div className="py-4 flex flex-col items-center justify-center opacity-20">
                                <Box className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-[8px] uppercase tracking-widest font-bold">Offline Module</span>
                             </div>
                          )}

                          {/* Progress bar for connecting state */}
                          {mcpStatus === MCPStatus.CONNECTING && (
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
                              <div className="h-full bg-amber-500 transition-all duration-300 ease-out" style={{ width: `${mcpProgress}%` }}></div>
                            </div>
                          )}

                          {/* Terminal-style Logs */}
                          {(mcpLogs.length > 0 || mcpStatus !== MCPStatus.DISCONNECTED) && (
                            <div className="mt-3 bg-black/40 rounded-lg border border-slate-800/50 p-3 max-h-40 overflow-y-auto scrollbar-hide flex flex-col-reverse gap-2">
                              {mcpLogs.length > 0 ? (
                                mcpLogs.map((log) => (
                                  <div key={log.id} className="flex gap-2 items-start opacity-0 animate-in fade-in slide-in-from-left-2 duration-300 fill-mode-forwards">
                                    <Terminal className={`w-2.5 h-2.5 flex-shrink-0 mt-0.5 ${
                                      log.severity === 'success' ? 'text-emerald-500' : 
                                      log.severity === 'warn' ? 'text-amber-500' : 
                                      log.severity === 'error' ? 'text-rose-500' : 'text-slate-600'
                                    }`} />
                                    <div className="flex flex-col">
                                      <p className={`text-[9px] font-mono leading-tight break-words ${
                                        log.severity === 'success' ? 'text-emerald-400' : 
                                        log.severity === 'warn' ? 'text-amber-400' : 
                                        log.severity === 'error' ? 'text-rose-400' : 'text-slate-400'
                                      }`}>
                                        {log.message}
                                      </p>
                                      <span className="text-[7px] text-slate-600 font-mono mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[9px] font-mono text-slate-700 italic">Listening for events...</p>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            {mcpStatus === MCPStatus.DISCONNECTED && (
                              <button onClick={connectMCP} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-600/20">Establish Protocol</button>
                            )}
                            {mcpStatus === MCPStatus.ERROR && (
                              <button onClick={connectMCP} className="flex-1 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 border border-rose-500/30 text-[10px] font-bold rounded-lg transition-all active:scale-95">Re-index Toolchain</button>
                            )}
                            {mcpStatus === MCPStatus.CONNECTED && (
                              <button className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold rounded-lg flex items-center justify-center gap-2 cursor-default"><Activity className="w-3 h-3 animate-pulse" /> Bridge Active</button>
                            )}
                          </div>
                        </div>

                        {mcpStatus === MCPStatus.DISCONNECTED && (
                          <div className="flex items-center gap-2 justify-center">
                            <button onClick={triggerMcpError} className="text-[9px] font-bold text-slate-600 hover:text-rose-500/80 transition-colors uppercase tracking-widest">Fail Handshake</button>
                            <span className="text-slate-800">•</span>
                            <button onClick={() => setMcpLogs([])} className="text-[9px] font-bold text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest">Clear Logs</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
             )}
          </div>
        </main>
      </div>

      {/* Figma Link Modal */}
      {showFigmaLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-[#0b1120] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-6 h-6"><Icons.Figma /></div><h3 className="text-lg font-bold">Link Figma Design</h3></div>
              <button onClick={() => setShowFigmaLinkModal(false)} className="text-slate-500 hover:text-white"><Plus className="w-6 h-6 rotate-45" /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              {!figmaFile ? (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-4">
                    <Info className="w-5 h-5 text-indigo-400" /><p className="text-xs text-indigo-200">Paste a Figma URL to link assets.</p>
                  </div>
                  <div className="relative">
                    <input type="text" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="https://www.figma.com/file/..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-4 pr-12 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    <button onClick={fetchFigmaFrames} disabled={!figmaUrl || isFetchingFigma} className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg">{isFetchingFigma ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {availableFrames.map(frame => {
                    const isLinked = !!linkedFrames.find(f => f.id === frame.id);
                    return (
                      <div key={frame.id} className={`group relative rounded-xl border transition-all ${isLinked ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
                        <img src={frame.thumbnail} alt={frame.name} className="h-32 w-full object-cover rounded-t-xl" />
                        <div className="p-3">
                          <p className="text-xs font-bold mb-1">{frame.name}</p>
                          <button onClick={() => isLinked ? unlinkFrame(frame.id) : linkFrame(frame)} className={`w-full py-2 rounded-lg text-[10px] font-bold ${isLinked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white'}`}>{isLinked ? 'Linked' : 'Link Frame'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end"><button onClick={() => setShowFigmaLinkModal(false)} className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xl shadow-indigo-600/20">Done</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

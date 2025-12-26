
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Box,
  Copy,
  Hash,
  ChevronLeft,
  FolderKanban,
  Layout,
  MoreHorizontal,
  WifiOff,
  Radio
} from 'lucide-react';
import { MCPStatus, StoryPart, FigmaFrame, Collaborator, RemoteCursor, FigmaFile, Version, MCPLogEntry, MCPLogSeverity, Epic, Story } from './types';
import { geminiService } from './services/geminiService';
import { Icons, FIGMA_COLORS } from './constants';

// Helper function to format timestamps into relative strings for UI display
const formatTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

const COLLABORATORS: Collaborator[] = [
  { id: 'u1', name: 'Sarah (Design)', color: '#F24E1E', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', isOnline: true },
  { id: 'u2', name: 'Mike (Dev)', color: '#A259FF', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', isOnline: true },
  { id: 'u3', name: 'Alex (PM)', color: '#0ACF83', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', isOnline: false },
];

const INITIAL_EPICS: Epic[] = [
  {
    id: 'e1',
    title: 'User Onboarding Revamp',
    description: 'Complete overhaul of the mobile and web onboarding experience.',
    timestamp: Date.now() - 86400000 * 5,
    stories: [
      {
        id: 's1',
        title: 'Authentication Flow',
        content: '# Auth Flow Specification\n\nUsers must be able to sign up using social providers...',
        status: 'in-progress',
        timestamp: Date.now() - 3600000,
        figmaFrames: ['f1']
      },
      {
        id: 's2',
        title: 'Email Verification',
        content: '# Email Verification\n\nTrigger a 6-digit OTP code to user email...',
        status: 'draft',
        timestamp: Date.now() - 7200000,
        figmaFrames: ['f2']
      }
    ]
  },
  {
    id: 'e2',
    title: 'Analytics Dashboard',
    description: 'Custom reporting and real-time activity tracking for admins.',
    timestamp: Date.now() - 86400000 * 2,
    stories: [
      {
        id: 's3',
        title: 'Real-time Charting',
        content: '# Charts\n\nImplement WebSockets for live data updates...',
        status: 'complete',
        timestamp: Date.now() - 3600000,
        figmaFrames: ['f3']
      }
    ]
  }
];

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'listing' | 'chat' | 'editor'>('listing');
  const [epics, setEpics] = useState<Epic[]>(INITIAL_EPICS);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<StoryPart[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Versions State
  const [versions, setVersions] = useState<Version[]>([]);
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
  const [frameSearchQuery, setFrameSearchQuery] = useState('');

  const [cursors, setCursors] = useState<RemoteCursor[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<any>(null);

  // Get active data
  const activeEpic = useMemo(() => epics.find(e => e.id === activeEpicId), [epics, activeEpicId]);
  const activeStory = useMemo(() => activeEpic?.stories.find(s => s.id === activeStoryId), [activeEpic, activeStoryId]);

  const addMcpLog = useCallback((message: string, severity: MCPLogSeverity = 'info') => {
    setMcpLogs(prev => [
      { id: Date.now().toString() + Math.random(), message, timestamp: Date.now(), severity },
      ...prev
    ]);
  }, []);

  // Update current story content
  const updateStoryContent = (newContent: string) => {
    if (!activeEpicId || !activeStoryId) return;
    setEpics(prev => prev.map(e => {
      if (e.id === activeEpicId) {
        return {
          ...e,
          stories: e.stories.map(s => s.id === activeStoryId ? { ...s, content: newContent } : s)
        };
      }
      return e;
    }));
  };

  // Auto-save logic
  useEffect(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (activeStory && activeStory.content !== versions[0]?.content) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveNewVersion();
      }, 5000);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [activeStory?.content]);

  const saveNewVersion = useCallback((label?: string) => {
    if (!activeStory) return;
    const newVersion: Version = {
      id: `v-${Date.now()}`,
      content: activeStory.content,
      timestamp: Date.now(),
      authorName: 'Mike (Dev)',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      label: label || 'Auto-save'
    };
    setVersions(prev => [newVersion, ...prev]);
  }, [activeStory?.content]);

  const revertToVersion = (version: Version) => {
    updateStoryContent(version.content);
    setSelectedVersionId(null);
    setShowHistory(false);
    saveNewVersion(`Restored to ${new Date(version.timestamp).toLocaleTimeString()}`);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isGenerating || !activeStory) return;
    const userMessage: StoryPart = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    try {
      const historyItems = messages.map(m => ({ role: m.role, content: m.content }));
      const systemInstruction = `You are StoryForge AI. You are helping Mike refine the User Story: "${activeStory.title}" within the Epic: "${activeEpic?.title}".`;
      const result = await geminiService.generateStory(input, historyItems, systemInstruction);
      const assistantMessage: StoryPart = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.text || 'Analysis complete.', timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Navigation Logic
  const openEpic = (epicId: string) => {
    setActiveEpicId(epicId);
    setActiveStoryId(null);
  };

  const openStory = (epicId: string, storyId: string) => {
    setActiveEpicId(epicId);
    setActiveStoryId(storyId);
    setViewMode('editor');
    setVersions([]); // Reset version history for the new story context
  };

  const goBack = () => {
    if (viewMode !== 'listing') {
      setViewMode('listing');
    } else if (activeStoryId) {
      setActiveStoryId(null);
    } else if (activeEpicId) {
      setActiveEpicId(null);
    }
  };

  // Creation Logic
  const addNewEpic = () => {
    const newEpic: Epic = {
      id: `e-${Date.now()}`,
      title: 'Untitled Epic',
      description: 'Click to edit description...',
      timestamp: Date.now(),
      stories: []
    };
    setEpics([newEpic, ...epics]);
    setActiveEpicId(newEpic.id);
  };

  const addNewStory = (epicId: string) => {
    const newStory: Story = {
      id: `s-${Date.now()}`,
      title: 'New Story Draft',
      content: '# New Story\n\nStart writing...',
      status: 'draft',
      timestamp: Date.now(),
      figmaFrames: []
    };
    setEpics(prev => prev.map(e => e.id === epicId ? { ...e, stories: [newStory, ...e.stories] } : e));
    openStory(epicId, newStory.id);
  };

  const connectMCP = () => {
    setMcpStatus(MCPStatus.CONNECTING);
    setMcpProgress(10);
    setMcpMessage('Initializing handshake...');
    addMcpLog('Starting Model Context Protocol (MCP) client...');
    
    setTimeout(() => {
      setMcpProgress(60);
      setMcpMessage('Resolving remote tools...');
    }, 800);

    setTimeout(() => { 
      setMcpProgress(100); 
      setMcpStatus(MCPStatus.CONNECTED); 
      setMcpMessage('Tunnel established'); 
      addMcpLog('MCP Bridge active', 'success'); 
    }, 2000);
  };

  const disconnectMCP = () => {
    setMcpStatus(MCPStatus.DISCONNECTED);
    setMcpMessage('Local MCP server inactive');
    setMcpProgress(0);
    addMcpLog('Session terminated', 'warn');
  };

  const fetchFigmaFrames = async () => {
    setIsFetchingFigma(true);
    setTimeout(() => {
      const mockFile: FigmaFile = { key: 'abc123figma', name: 'Design System', lastModified: new Date().toISOString(), thumbnailUrl: 'https://picsum.photos/seed/figmafile/400/200' };
      const mockFrames: FigmaFrame[] = [{ id: 'f1', name: 'Login Screen', thumbnail: 'https://picsum.photos/seed/login/400/300', description: 'User login.' }];
      setFigmaFile(mockFile);
      setAvailableFrames(mockFrames);
      setIsFetchingFigma(false);
      setShowFigmaLinkModal(true);
    }, 1000);
  };

  const linkFrame = (frame: FigmaFrame) => {
    if (linkedFrames.find(f => f.id === frame.id)) return;
    setLinkedFrames([...linkedFrames, { ...frame, linkedAt: Date.now() }]);
  };

  const insertFrameReference = (frame: FigmaFrame) => {
    const reference = `\n\n> [Ref: ${frame.name}] - Design verification required.`;
    updateStoryContent((activeStory?.content || '') + reference);
    linkFrame(frame);
    setShowFigmaLinkModal(false);
  };

  const unlinkFrame = (frameId: string) => setLinkedFrames(linkedFrames.filter(f => f.id !== frameId));

  const previewVersion = versions.find(v => v.id === selectedVersionId);
  const filteredFrames = availableFrames.filter(f => f.name.toLowerCase().includes(frameSearchQuery.toLowerCase()));

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-16 flex-shrink-0 border-r border-slate-800 flex flex-col items-center py-6 bg-[#0b1120] gap-8">
        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer" onClick={() => { setViewMode('listing'); setActiveEpicId(null); }}>
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setViewMode('listing')} className={`p-2 rounded-lg transition-colors ${viewMode === 'listing' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Layout className="w-6 h-6" />
          </button>
          <button 
            disabled={!activeStoryId}
            onClick={() => { setViewMode('editor'); setShowHistory(false); }} 
            className={`p-2 rounded-lg transition-colors ${viewMode === 'editor' && !showHistory ? 'bg-indigo-500/10 text-indigo-400' : activeStoryId ? 'text-slate-500 hover:text-slate-300' : 'text-slate-800 cursor-not-allowed'}`}
          >
            <FileText className="w-6 h-6" />
          </button>
          <button 
            disabled={!activeStoryId}
            onClick={() => { setViewMode('chat'); setShowHistory(false); }} 
            className={`p-2 rounded-lg transition-colors ${viewMode === 'chat' ? 'bg-indigo-500/10 text-indigo-400' : activeStoryId ? 'text-slate-500 hover:text-slate-300' : 'text-slate-800 cursor-not-allowed'}`}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
          <button 
            disabled={!activeStoryId}
            onClick={() => setShowHistory(!showHistory)} 
            className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-amber-500/10 text-amber-500' : activeStoryId ? 'text-slate-500 hover:text-slate-300' : 'text-slate-800 cursor-not-allowed'}`}
          >
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
          <div className="flex items-center gap-4">
            {(activeEpicId || viewMode !== 'listing') && (
              <button onClick={goBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-slate-800 rounded">
                {activeStoryId ? <FileText className="w-4 h-4 text-indigo-400" /> : <FolderKanban className="w-4 h-4 text-amber-400" />}
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  {activeStoryId ? activeStory?.title : activeEpicId ? activeEpic?.title : 'Project Dashboard'}
                </h2>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] text-slate-500 font-medium">
                     {activeEpicId ? `Epic: ${activeEpic?.title}` : 'StoryForge Repository'}
                   </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {COLLABORATORS.filter(c => c.isOnline).map(c => (
                <div key={c.id} className="relative group">
                  <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 transition-transform hover:scale-110" style={{ borderColor: c.color }} />
                </div>
              ))}
            </div>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-lg hover:bg-indigo-600/20 transition-all">
              <Users className="w-3.5 h-3.5" /> Invite
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex">
          {viewMode === 'listing' ? (
            /* Dashboard / Epic Detail View */
            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                      {activeEpicId ? activeEpic?.title : 'Project Workspace'}
                    </h1>
                    <p className="text-slate-500 text-sm">
                      {activeEpicId ? activeEpic?.description : 'Manage your product development cycle with nested epics and stories.'}
                    </p>
                  </div>
                  <button 
                    onClick={() => activeEpicId ? addNewStory(activeEpicId) : addNewEpic()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    {activeEpicId ? 'New User Story' : 'New Product Epic'}
                  </button>
                </div>

                {!activeEpicId ? (
                  /* Epics Grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {epics.map(epic => (
                      <div 
                        key={epic.id} 
                        onClick={() => openEpic(epic.id)}
                        className="group bg-slate-900/40 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FolderKanban className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{epic.title}</h3>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-6">{epic.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-slate-400">{epic.stories.length} stories</span>
                             <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                             <span className="text-[10px] text-slate-600 uppercase font-bold">Last updated {formatTime(epic.timestamp)}</span>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-700" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Stories List */
                  <div className="space-y-3">
                    {activeEpic.stories.length === 0 ? (
                      <div className="py-20 text-center bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                        <Box className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <h4 className="text-slate-400 font-bold">No stories found in this epic</h4>
                        <p className="text-slate-600 text-xs mt-2">Click "New User Story" to start building.</p>
                      </div>
                    ) : (
                      activeEpic.stories.map(story => (
                        <div 
                          key={story.id} 
                          onClick={() => openStory(activeEpic.id, story.id)}
                          className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-200">{story.title}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {story.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                              story.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' :
                              story.status === 'in-progress' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {story.status.replace('-', ' ')}
                            </span>
                            <div className="flex -space-x-1 opacity-40 group-hover:opacity-100 transition-opacity">
                               <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700"></div>
                               <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700"></div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'editor' ? (
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
                    value={selectedVersionId ? (previewVersion?.content || '') : activeStory?.content}
                    onChange={(e) => !selectedVersionId && updateStoryContent(e.target.value)}
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
                {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 text-center max-w-xs mx-auto">
                      <MessageSquare className="w-12 h-12 mb-4" />
                      <h4 className="font-bold">Team Thread</h4>
                      <p className="text-xs mt-2">Ask AI for feedback or discuss story requirements with your team.</p>
                   </div>
                )}
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
                  <textarea 
                    rows={1} 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder="Ask AI about this story..." 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-2" 
                  />
                  <button onClick={handleSendMessage} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"><Send className="w-5 h-5" /></button>
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
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2"><div className="w-4 h-4"><Icons.Figma /></div><span className="text-xs font-bold">Figma Designs</span></div>
                        </div>
                        {linkedFrames.length === 0 ? (
                          <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center">
                            <LinkIcon className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                            <p className="text-[10px] text-slate-500 mb-4">No designs linked.</p>
                            <button onClick={() => setShowFigmaLinkModal(true)} className="w-full py-1.5 bg-slate-900 border border-slate-800 text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-colors">Import</button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {linkedFrames.map(frame => (
                              <div key={frame.id} className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 hover:border-indigo-500/50 transition-all">
                                <img src={frame.thumbnail} alt={frame.name} className="w-full h-24 object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => unlinkFrame(frame.id)} className="p-1.5 bg-rose-500/20 text-rose-500 rounded-lg hover:bg-rose-500/40"><Trash2 className="w-3 h-3" /></button>
                                </div>
                                <div className="absolute bottom-2 left-3"><p className="text-[10px] font-bold text-white">{frame.name}</p></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Enhanced MCP Panel with Distinct Status Icons */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-amber-500">
                            <ToyBrick className="w-4 h-4" />
                            <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">MCP Toolchain</span>
                          </div>
                          {mcpStatus === MCPStatus.CONNECTED && (
                            <button onClick={disconnectMCP} className="text-[8px] uppercase tracking-tighter text-slate-500 hover:text-rose-400 transition-colors font-bold flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> Stop
                            </button>
                          )}
                        </div>

                        <div className={`group relative p-4 rounded-xl border transition-all duration-700 overflow-hidden ${
                          mcpStatus === MCPStatus.CONNECTED ? 'border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 
                          mcpStatus === MCPStatus.CONNECTING ? 'border-amber-500/30 bg-amber-500/5' : 
                          mcpStatus === MCPStatus.ERROR ? 'border-rose-500/30 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 
                          'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                        }`}>
                          {/* Background dynamic glow */}
                          {mcpStatus === MCPStatus.CONNECTED && (
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full"></div>
                          )}
                          {mcpStatus === MCPStatus.ERROR && (
                            <div className="absolute -top-12 -right-12 w-24 h-24 bg-rose-500/10 blur-3xl rounded-full animate-pulse"></div>
                          )}

                          <div className="relative flex items-start justify-between mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className={`relative flex items-center justify-center w-2 h-2`}>
                                   {mcpStatus === MCPStatus.CONNECTING && (
                                     <div className="absolute w-4 h-4 rounded-full border border-amber-500/40 animate-ping"></div>
                                   )}
                                   <div className={`w-2 h-2 rounded-full z-10 ${
                                     mcpStatus === MCPStatus.CONNECTED ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]' : 
                                     mcpStatus === MCPStatus.CONNECTING ? 'bg-amber-500' : 
                                     mcpStatus === MCPStatus.ERROR ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'
                                   }`}></div>
                                </div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${
                                  mcpStatus === MCPStatus.CONNECTED ? 'text-emerald-500' :
                                  mcpStatus === MCPStatus.CONNECTING ? 'text-amber-500' :
                                  mcpStatus === MCPStatus.ERROR ? 'text-rose-500' : 'text-slate-500'
                                }`}>
                                  {mcpStatus}
                                </p>
                              </div>
                              <p className="text-xs font-bold text-slate-200 tracking-tight leading-none">{mcpMessage}</p>
                            </div>
                            
                            {/* Distinct Icons for Status */}
                            <div className={`p-2 rounded-xl transition-all duration-300 ${
                              mcpStatus === MCPStatus.CONNECTED ? 'bg-emerald-500/20 text-emerald-400' :
                              mcpStatus === MCPStatus.CONNECTING ? 'bg-amber-500/20 text-amber-400' :
                              mcpStatus === MCPStatus.ERROR ? 'bg-rose-500/20 text-rose-400' :
                              'bg-slate-800/80 text-slate-500'
                            }`}>
                              {mcpStatus === MCPStatus.CONNECTING ? (
                                <Radio className="w-4 h-4 animate-pulse" />
                              ) : mcpStatus === MCPStatus.CONNECTED ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : mcpStatus === MCPStatus.ERROR ? (
                                <AlertCircle className="w-4 h-4" />
                              ) : (
                                <WifiOff className="w-4 h-4" />
                              )}
                            </div>
                          </div>

                          {mcpStatus === MCPStatus.DISCONNECTED && (
                             <div className="py-2 flex flex-col items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
                                <Box className="w-6 h-6 text-slate-400 mb-2" />
                                <span className="text-[8px] uppercase tracking-widest font-black">Link Pending</span>
                             </div>
                          )}

                          {mcpStatus === MCPStatus.CONNECTING && (
                            <div className="relative w-full h-1 bg-slate-800/50 rounded-full overflow-hidden mb-3">
                              <div className="absolute top-0 left-0 h-full bg-amber-500/50 w-1/3 animate-[shimmer_2s_infinite]"></div>
                              <div className="h-full bg-amber-500 transition-all duration-500 ease-out" style={{ width: `${mcpProgress}%` }}></div>
                            </div>
                          )}

                          {(mcpLogs.length > 0 || mcpStatus !== MCPStatus.DISCONNECTED) && (
                            <div className="mt-2 bg-black/40 rounded-lg border border-slate-800/50 p-2 max-h-32 overflow-y-auto scrollbar-hide flex flex-col-reverse gap-1.5 shadow-inner">
                              {mcpLogs.length > 0 ? (
                                mcpLogs.map((log) => (
                                  <div key={log.id} className="flex gap-2 items-start animate-in fade-in slide-in-from-left-1 duration-200">
                                    <Terminal className={`w-2 h-2 flex-shrink-0 mt-0.5 ${
                                      log.severity === 'success' ? 'text-emerald-500' : 
                                      log.severity === 'warn' ? 'text-amber-500' : 
                                      log.severity === 'error' ? 'text-rose-500' : 'text-slate-600'
                                    }`} />
                                    <div className="flex flex-col">
                                      <p className={`text-[8px] font-mono leading-tight tracking-tight ${
                                        log.severity === 'success' ? 'text-emerald-400' : 
                                        log.severity === 'warn' ? 'text-amber-400' : 
                                        log.severity === 'error' ? 'text-rose-400' : 'text-slate-500'
                                      }`}>
                                        {log.message}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[8px] font-mono text-slate-800 uppercase tracking-tighter">IO Interface Active</p>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            {mcpStatus === MCPStatus.DISCONNECTED && (
                              <button onClick={connectMCP} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
                                Connect
                              </button>
                            )}
                            {mcpStatus === MCPStatus.ERROR && (
                              <button onClick={connectMCP} className="flex-1 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 border border-rose-500/30 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95">
                                Reconnect
                              </button>
                            )}
                            {mcpStatus === MCPStatus.CONNECTED && (
                              <button className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 cursor-default group-hover:bg-emerald-500/20 transition-all">
                                <Activity className="w-3 h-3 animate-pulse" /> Established
                              </button>
                            )}
                          </div>
                        </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1120] border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg shadow-inner"><Icons.Figma /></div>
                <div>
                  <h3 className="text-lg font-bold">Figma Asset Browser</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Sync design with specification</p>
                </div>
              </div>
              <button onClick={() => setShowFigmaLinkModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-72 border-r border-slate-800 p-6 flex flex-col gap-6 bg-slate-900/20">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Source File</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={figmaUrl}
                        onChange={(e) => setFigmaUrl(e.target.value)}
                        placeholder="Paste Figma URL..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-3 pr-10 text-xs focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      <button 
                        onClick={fetchFigmaFrames}
                        disabled={!figmaUrl || isFetchingFigma}
                        className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 rounded-lg"
                      >
                        {isFetchingFigma ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {figmaFile && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Filter</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-600" />
                        <input type="text" value={frameSearchQuery} onChange={(e) => setFrameSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 text-xs" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-950/20">
                {!figmaFile ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <LinkIcon className="w-12 h-12 mb-4" />
                    <p className="text-xs">Enter a Figma URL to start browsing.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFrames.map(frame => {
                      const isLinked = !!linkedFrames.find(f => f.id === frame.id);
                      return (
                        <div key={frame.id} className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${isLinked ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'}`}>
                          <div className="h-32 bg-slate-800 overflow-hidden">
                            <img src={frame.thumbnail} alt={frame.name} className="w-full h-full object-cover opacity-80" />
                          </div>
                          <div className="p-3">
                            <span className="text-xs font-bold text-slate-200 truncate block mb-3">{frame.name}</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => isLinked ? unlinkFrame(frame.id) : linkFrame(frame)} className={`py-1.5 rounded-lg text-[9px] font-bold ${isLinked ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'}`}>
                                {isLinked ? 'Unlink' : 'Link'}
                              </button>
                              <button onClick={() => insertFrameReference(frame)} className="py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-[9px] font-bold">Ref</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

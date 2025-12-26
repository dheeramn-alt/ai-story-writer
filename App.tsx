
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
  Radio,
  ArrowRightLeft,
  ArrowUp,
  ArrowDown,
  X,
  Sparkles,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { MCPStatus, StoryPart, FigmaFrame, Collaborator, RemoteCursor, FigmaFile, Version, MCPLogEntry, MCPLogSeverity, Epic, Story } from './types';
import { geminiService } from './services/geminiService';
import { Icons, FIGMA_COLORS } from './constants';

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
  }
];

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'listing' | 'editor'>('listing');
  const [epics, setEpics] = useState<Epic[]>(INITIAL_EPICS);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState<StoryPart[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  
  // Interaction State
  const [movingStoryId, setMovingStoryId] = useState<string | null>(null);
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<any>(null);

  const activeEpic = useMemo(() => epics.find(e => e.id === activeEpicId), [epics, activeEpicId]);
  const activeStory = useMemo(() => activeEpic?.stories.find(s => s.id === activeStoryId), [activeEpic, activeStoryId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMcpLog = useCallback((message: string, severity: MCPLogSeverity = 'info') => {
    setMcpLogs(prev => [
      { id: Date.now().toString() + Math.random(), message, timestamp: Date.now(), severity },
      ...prev
    ]);
  }, []);

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
      const systemInstruction = `You are StoryForge AI. You are helping Mike refine the User Story: "${activeStory.title}" within the Epic: "${activeEpic?.title}". Help with technical details, acceptance criteria, or design feedback.`;
      const result = await geminiService.generateStory(input, historyItems, systemInstruction);
      const assistantMessage: StoryPart = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.text || 'Analysis complete.', timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const draftWithAI = async () => {
    if (isGenerating || !activeStory) return;
    setIsGenerating(true);
    try {
      const systemInstruction = `You are a world-class Product Manager. Draft a comprehensive User Story for "${activeStory.title}" within the Epic context of "${activeEpic?.title}". Include Title, Description, and Acceptance Criteria in Markdown.`;
      const result = await geminiService.generateStory("Please generate a detailed user story draft based on the title.", [], systemInstruction);
      if (result.text) {
        updateStoryContent(result.text);
        saveNewVersion("AI Generated Draft");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const openEpic = (epicId: string) => {
    setActiveEpicId(epicId);
    setActiveStoryId(null);
  };

  const openStory = (epicId: string, storyId: string) => {
    setActiveEpicId(epicId);
    setActiveStoryId(storyId);
    setViewMode('editor');
    setVersions([]); 
    setMessages([]); // Clear chat history for the new story
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

  const deleteEpic = (e: React.MouseEvent, epicId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this epic and all its stories?')) {
      setEpics(prev => prev.filter(ep => ep.id !== epicId));
      if (activeEpicId === epicId) {
        setActiveEpicId(null);
        setActiveStoryId(null);
        setViewMode('listing');
      }
    }
  };

  const addNewStory = (epicId: string) => {
    const newStory: Story = {
      id: `s-${Date.now()}`,
      title: 'New Story Draft',
      content: '# New Story\n\nStart writing or use AI to draft...',
      status: 'draft',
      timestamp: Date.now(),
      figmaFrames: []
    };
    setEpics(prev => prev.map(e => e.id === epicId ? { ...e, stories: [newStory, ...e.stories] } : e));
    openStory(epicId, newStory.id);
  };

  const deleteStory = (e: React.MouseEvent, epicId: string, storyId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this story?')) {
      setEpics(prev => prev.map(ep => {
        if (ep.id === epicId) {
          return {
            ...ep,
            stories: ep.stories.filter(s => s.id !== storyId)
          };
        }
        return ep;
      }));
      if (activeStoryId === storyId) {
        setActiveStoryId(null);
        setViewMode('listing');
      }
    }
  };

  const moveStoryToEpic = (storyId: string, sourceEpicId: string, targetEpicId: string) => {
    const sourceEpic = epics.find(e => e.id === sourceEpicId);
    const storyToMove = sourceEpic?.stories.find(s => s.id === storyId);
    if (!storyToMove) return;

    setEpics(prev => prev.map(e => {
      if (e.id === sourceEpicId) {
        return { ...e, stories: e.stories.filter(s => s.id !== storyId) };
      }
      if (e.id === targetEpicId) {
        return { ...e, stories: [...e.stories, storyToMove] };
      }
      return e;
    }));
    setMovingStoryId(null);
  };

  const reorderStory = (epicId: string, storyId: string, direction: 'up' | 'down') => {
    setEpics(prev => prev.map(e => {
      if (e.id !== epicId) return e;
      const newStories = [...e.stories];
      const index = newStories.findIndex(s => s.id === storyId);
      if (index === -1) return e;
      if (direction === 'up' && index > 0) {
        [newStories[index], newStories[index - 1]] = [newStories[index - 1], newStories[index]];
      } else if (direction === 'down' && index < newStories.length - 1) {
        [newStories[index], newStories[index + 1]] = [newStories[index + 1], newStories[index]];
      }
      return { ...e, stories: newStories };
    }));
  };

  const connectMCP = () => {
    setMcpStatus(MCPStatus.CONNECTING);
    setMcpProgress(10);
    setMcpMessage('Initializing handshake...');
    addMcpLog('Starting Model Context Protocol (MCP) client...');
    setTimeout(() => { setMcpProgress(60); setMcpMessage('Resolving remote tools...'); }, 800);
    setTimeout(() => { setMcpProgress(100); setMcpStatus(MCPStatus.CONNECTED); setMcpMessage('Tunnel established'); addMcpLog('MCP Bridge active', 'success'); }, 2000);
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
      <div className="w-16 flex-shrink-0 border-r border-slate-800 flex flex-col items-center py-6 bg-[#0b1120] gap-8 z-30">
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
            {viewMode === 'editor' && (
              <button 
                onClick={() => setShowChatSidebar(!showChatSidebar)}
                className={`p-2 rounded-lg transition-colors ${showChatSidebar ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
                title="Toggle AI Sidepanel"
              >
                {showChatSidebar ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
              </button>
            )}
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <div className="flex -space-x-2">
              {COLLABORATORS.filter(c => c.isOnline).map(c => (
                <div key={c.id} className="relative group">
                  <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-slate-800 transition-transform hover:scale-110" style={{ borderColor: c.color }} />
                </div>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex">
          {viewMode === 'listing' ? (
            /* Dashboard View */
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {epics.map(epic => (
                      <div key={epic.id} onClick={() => openEpic(epic.id)} className="group bg-slate-900/40 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer relative overflow-hidden">
                        <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => deleteEpic(e, epic.id)} className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          <MoreHorizontal className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FolderKanban className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{epic.title}</h3>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-6">{epic.description}</p>
                        <div className="flex items-center justify-between mt-auto text-xs text-slate-400 font-bold">
                           <span>{epic.stories.length} stories</span>
                           <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeEpic.stories.length === 0 ? (
                      <div className="py-20 text-center bg-slate-900/20 rounded-2xl border border-dashed border-slate-800 text-slate-400 font-bold">No stories found. Click New User Story to start.</div>
                    ) : (
                      activeEpic.stories.map((story, sIdx) => (
                        <div key={story.id} onClick={() => openStory(activeEpic.id, story.id)} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all cursor-pointer group">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-40 transition-opacity">
                               <button disabled={sIdx === 0} onClick={(e) => { e.stopPropagation(); reorderStory(activeEpic.id, story.id, 'up'); }} className="p-0.5 hover:bg-slate-700 rounded"><ArrowUp className="w-3 h-3" /></button>
                               <button disabled={sIdx === activeEpic.stories.length - 1} onClick={(e) => { e.stopPropagation(); reorderStory(activeEpic.id, story.id, 'down'); }} className="p-0.5 hover:bg-slate-700 rounded"><ArrowDown className="w-3 h-3" /></button>
                            </div>
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-indigo-400" /></div>
                            <div>
                              <h4 className="font-bold text-slate-200">{story.title}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {story.id}</p>
                            </div>
                          </div>
                          
                          {movingStoryId === story.id ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                               <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Move to:</span>
                               {epics.filter(e => e.id !== activeEpic.id).map(target => (
                                 <button key={target.id} onClick={(e) => { e.stopPropagation(); moveStoryToEpic(story.id, activeEpic.id, target.id); }} className="px-2 py-1 bg-indigo-600/20 border border-indigo-500/30 text-[9px] font-bold rounded hover:bg-indigo-600 hover:text-white transition-all">{target.title}</button>
                               ))}
                               <button onClick={(e) => { e.stopPropagation(); setMovingStoryId(null); }} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-6">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${story.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{story.status}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setMovingStoryId(story.id); }} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 rounded-lg"><ArrowRightLeft className="w-4 h-4" /></button>
                                <button onClick={(e) => deleteStory(e, activeEpic.id, story.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                <ChevronRight className="w-5 h-5 text-slate-700" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Inner Story Page: Editor + Side Chat */
            <div className="flex-1 flex overflow-hidden">
              {/* Main Editor Pane */}
              <div className="flex-1 flex flex-col relative bg-[#0b0f1a] border-r border-slate-800">
                {/* Editor Header Toolbar */}
                <div className="h-12 border-b border-slate-800/60 bg-[#0f172a] flex items-center justify-between px-6 z-10">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={draftWithAI} 
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-lg shadow-indigo-600/10 transition-all active:scale-95"
                    >
                      {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Draft with AI
                    </button>
                    <div className="h-4 w-[1px] bg-slate-800"></div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Markdown Editor</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-bold italic">{versions.length > 0 ? `Last save ${formatTime(versions[0].timestamp)}` : 'Draft'}</span>
                    <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-amber-500 transition-colors"><History className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative scrollbar-hide">
                  {selectedVersionId && previewVersion && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 px-4 py-1 rounded-full z-30 font-bold text-[10px] shadow-xl flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Historical Version: {new Date(previewVersion.timestamp).toLocaleTimeString()}
                      <button onClick={() => setSelectedVersionId(null)} className="ml-2 hover:underline">Exit Preview</button>
                    </div>
                  )}
                  <div className="max-w-4xl mx-auto min-h-full bg-slate-900/20 rounded-3xl border border-slate-800/40 p-8 lg:p-12 shadow-inner relative group">
                    <textarea 
                      ref={editorRef}
                      value={selectedVersionId ? (previewVersion?.content || '') : activeStory?.content}
                      onChange={(e) => !selectedVersionId && updateStoryContent(e.target.value)}
                      readOnly={!!selectedVersionId}
                      spellCheck={false}
                      className="w-full h-full bg-transparent border-none focus:ring-0 text-slate-300 font-mono text-sm leading-relaxed resize-none p-0"
                      placeholder="The canvas is empty. Start writing or use AI to generate a draft..."
                    />
                  </div>
                </div>
              </div>

              {/* Integrated AI Chat Sidebar */}
              {showChatSidebar && (
                <div className="w-96 flex flex-col bg-[#0b1120] animate-in slide-in-from-right duration-300">
                  <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-[#0f172a]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Story Intelligence</span>
                    </div>
                    <button onClick={() => setMessages([])} className="p-1 hover:bg-slate-800 rounded text-slate-600 hover:text-slate-300" title="Clear Thread"><RotateCcw className="w-3.5 h-3.5" /></button>
                  </div>

                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth scrollbar-hide">
                    {messages.length === 0 && (
                       <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-8">
                          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4"><Zap className="w-6 h-6 text-indigo-400" /></div>
                          <h4 className="text-sm font-bold text-slate-300">AI Context Engine</h4>
                          <p className="text-[10px] mt-2 leading-relaxed">Ask about Figma links, technical feasibility, or request acceptance criteria suggestions.</p>
                       </div>
                    )}
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800/60 border border-slate-700/50 text-slate-200 shadow-sm'}`}>
                          {msg.content}
                          <div className={`mt-1 text-[8px] font-bold uppercase opacity-40 ${msg.role === 'user' ? 'text-white' : 'text-slate-400'}`}>
                            {msg.role === 'user' ? 'Mike' : 'StoryForge'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="flex justify-start">
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 flex gap-2 items-center">
                          <div className="flex gap-1">
                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Analyzing context</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-800 bg-[#0b1120]">
                    <div className="flex items-end gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl focus-within:border-indigo-500/50 transition-all">
                      <textarea 
                        rows={1} 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder="Discuss story details..." 
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs py-2 px-3 resize-none max-h-32" 
                      />
                      <button 
                        onClick={handleSendMessage} 
                        disabled={!input.trim() || isGenerating}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Context Panel - Right Side (Only when in Listing or if Chat is off) */}
          {(viewMode === 'listing' || !showChatSidebar) && (
            <div className="w-80 border-l border-slate-800 flex flex-col bg-[#0b1120] hidden xl:flex">
              {showHistory ? (
                  <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2"><History className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-bold uppercase tracking-wider">Timeline</span></div>
                      <button onClick={() => { setShowHistory(false); setSelectedVersionId(null); }} className="p-1 hover:bg-slate-800 rounded text-slate-500"><X className="w-4 h-4" /></button>
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
                    
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                      <div className="p-4 space-y-6">
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
                                    <button onClick={() => unlinkFrame(frame.id)} className="p-1.5 bg-rose-500/20 text-rose-500 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                  <div className="absolute bottom-2 left-3 font-bold text-[10px]">{frame.name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-amber-500">
                              <ToyBrick className="w-4 h-4" />
                              <span className="text-xs font-bold text-slate-200 uppercase tracking-tight">MCP Toolchain</span>
                            </div>
                            {mcpStatus === MCPStatus.CONNECTED && (
                              <button onClick={disconnectMCP} className="text-[8px] uppercase tracking-tighter text-slate-500 hover:text-rose-400 font-bold flex items-center gap-1"><XCircle className="w-2.5 h-2.5" /> Stop</button>
                            )}
                          </div>

                          <div className={`p-4 rounded-xl border transition-all duration-700 ${mcpStatus === MCPStatus.CONNECTED ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${mcpStatus === MCPStatus.CONNECTED ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]' : 'bg-slate-700'}`}></div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{mcpStatus}</p>
                                </div>
                                <p className="text-xs font-bold text-slate-200 leading-none">{mcpMessage}</p>
                              </div>
                              <div className="p-2 bg-slate-800 rounded-xl">
                                {mcpStatus === MCPStatus.CONNECTED ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-slate-600" />}
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                              {mcpStatus === MCPStatus.DISCONNECTED ? (
                                <button onClick={connectMCP} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-600/20">Connect</button>
                              ) : (
                                <div className="flex-1 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2"><Activity className="w-3 h-3 animate-pulse" /> Established</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Figma Link Modal */}
      {showFigmaLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b1120] border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg shadow-inner"><Icons.Figma /></div>
                <div><h3 className="text-lg font-bold">Figma Browser</h3><p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Link design with specs</p></div>
              </div>
              <button onClick={() => setShowFigmaLinkModal(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-72 border-r border-slate-800 p-6 flex flex-col gap-6 bg-slate-900/20">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Source File</label>
                    <div className="relative">
                      <input type="text" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="Paste Figma URL..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-3 pr-10 text-xs" />
                      <button onClick={fetchFigmaFrames} disabled={!figmaUrl || isFetchingFigma} className="absolute right-1.5 top-1.5 p-1 bg-indigo-600 rounded-lg">
                        {isFetchingFigma ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-950/20">
                {!figmaFile ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40"><LinkIcon className="w-12 h-12 mb-4" /><p className="text-xs">Enter a Figma URL to start browsing.</p></div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFrames.map(frame => {
                      const isLinked = !!linkedFrames.find(f => f.id === frame.id);
                      return (
                        <div key={frame.id} className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${isLinked ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'}`}>
                          <div className="h-32 bg-slate-800 overflow-hidden"><img src={frame.thumbnail} alt={frame.name} className="w-full h-full object-cover opacity-80" /></div>
                          <div className="p-3">
                            <span className="text-xs font-bold text-slate-200 truncate block mb-3">{frame.name}</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => isLinked ? unlinkFrame(frame.id) : linkFrame(frame)} className={`py-1.5 rounded-lg text-[9px] font-bold ${isLinked ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'}`}>{isLinked ? 'Unlink' : 'Link'}</button>
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


export enum MCPStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export type MCPLogSeverity = 'info' | 'warn' | 'error' | 'success';

export interface MCPLogEntry {
  id: string;
  message: string;
  timestamp: number;
  severity: MCPLogSeverity;
}

export interface FigmaFrame {
  id: string;
  name: string;
  thumbnail: string;
  description?: string;
  linkedAt?: number;
}

export interface FigmaFile {
  key: string;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'in-progress' | 'complete';
  timestamp: number;
  figmaFrames: string[]; // IDs
}

export interface Epic {
  id: string;
  title: string;
  description: string;
  stories: Story[];
  timestamp: number;
}

export interface StoryPart {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  figmaRef?: string;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar: string;
  isOnline: boolean;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export interface Version {
  id: string;
  content: string;
  timestamp: number;
  authorName: string;
  authorAvatar: string;
  label?: string;
}

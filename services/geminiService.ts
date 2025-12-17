
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const getFigmaData: FunctionDeclaration = {
  name: 'get_figma_frames',
  parameters: {
    type: Type.OBJECT,
    description: 'Retrieves current Figma design frames to understand layout and UI components.',
    properties: {
      fileKey: { type: Type.STRING, description: 'The unique key for the Figma file' },
      frameIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Specific frame IDs to inspect' }
    },
    required: ['fileKey']
  }
};

const queryMCPServer: FunctionDeclaration = {
  name: 'query_mcp_server',
  parameters: {
    type: Type.OBJECT,
    description: 'Queries the connected MCP (Model Context Protocol) server for codebase context or technical documentation.',
    properties: {
      resourcePath: { type: Type.STRING, description: 'The path to the resource or tool name in the MCP server' },
      arguments: { type: Type.OBJECT, description: 'JSON arguments for the MCP tool' }
    },
    required: ['resourcePath']
  }
};

export class StoryForgeService {
  // Use explicit GoogleGenAI type for world-class type safety
  private ai: GoogleGenAI;
  private modelName: string = 'gemini-3-pro-preview';

  constructor() {
    // Correct initialization using process.env.API_KEY directly as per @google/genai guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateStory(prompt: string, history: { role: string, content: string }[], systemInstruction: string) {
    const chat = this.ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [getFigmaData, queryMCPServer] }],
        temperature: 0.7,
      },
      history: history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] }))
    });

    const response = await chat.sendMessage({ message: prompt });
    return response;
  }
}

export const geminiService = new StoryForgeService();

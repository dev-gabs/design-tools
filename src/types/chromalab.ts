export type ToolId = 'mesh' | 'palette' | 'pattern' | 'texture' | 'type' | 'glass';

export interface ToolMetadata {
  id: ToolId;
  name: string;
  tagline: string;
  description: string;
  category: string;
  badge?: string;
}

export interface SharedProject {
  id: string;
  toolId: ToolId;
  name: string;
  updatedAt: number;
  data: unknown;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: string[];
  createdAt: number;
}

export const TOOL_IDS = ['mesh', 'palette', 'pattern', 'texture', 'type', 'glass', 'recolor'] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const isToolId = (value: string): value is ToolId => (TOOL_IDS as readonly string[]).includes(value);

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

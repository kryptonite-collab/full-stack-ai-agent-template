export type KBScope = "personal" | "org" | "app";

export interface KnowledgeBase {
  id: string;
  organization_id: string | null;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  scope: KBScope;
  collection_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface KnowledgeBaseList {
  items: KnowledgeBase[];
  total: number;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description?: string;
  scope: KBScope;
}

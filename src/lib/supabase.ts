import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asfpowlbrzwgolwetvkj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZnBvd2xicnp3Z29sd2V0dmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTc2NjQsImV4cCI6MjEwNjE3MzY2NH0.GQjGOvb5_cgO89Kq6d4CLp5VRYEw-qTtYofD57hmMAQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  name: string;
  username: string;
  role: 'supervisor' | 'tecnico';
  created_at: string;
  updated_at: string;
};

export type Board = {
  id: string;
  code: string;
  location: string;
  type: string;
  checklist_type: string;
  description: string;
  last_inspection: string | null;
  status: 'Em dia' | 'Pendente';
  frequency: 'monthly' | 'semester' | 'annual';
  created_at: string;
  updated_at: string;
  // CamelCase aliases for app compatibility
  checklistType?: string;
  lastInspection?: string | null;
};

export type ChecklistDefinition = {
  id: string;
  checklist_type: string;
  item_order: number;
  label: string;
  created_at: string;
};

export type Inspection = {
  id: string;
  board_id: string;
  performed_by: string | null;
  performed_by_name: string;
  date: string;
  created_at: string;
};

export type InspectionItem = {
  id: string;
  inspection_id: string;
  checklist_definition_id: string;
  answer: 'Conforme' | 'Não conforme' | 'N/A';
  note: string;
  photo: string | null;
  created_at: string;
};

export type NonConformity = {
  id: string;
  inspection_id: string | null;
  board_id: string | null;
  board_code: string;
  location: string;
  type: string;
  item: string;
  description: string;
  date: string;
  priority: 'Crítica' | 'Alta' | 'Média';
  status: 'Aberta' | 'Em tratamento' | 'Resolvida';
  resolved_after_inspection: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  photo: string | null;
  performed_by: string | null;
  performed_by_name: string;
  created_at: string;
  updated_at: string;
  // CamelCase aliases for app compatibility
  inspection?: string;
  boardId?: string | null;
  boardCode?: string;
  board?: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  performedBy?: string | null;
  performedByName?: string;
  items?: NonConformity[];
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Board, ChecklistDefinition, Inspection, InspectionItem, NonConformity, Profile } from '../lib/supabase';

export const useBoards = () => {
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('location', { ascending: true })
        .order('code', { ascending: true });
      if (error) throw error;
      return data as Board[];
    },
  });
};

export const useChecklistDefinitions = (type: string) => {
  return useQuery({
    queryKey: ['checklist_definitions', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_definitions')
        .select('*')
        .eq('checklist_type', type)
        .order('item_order', { ascending: true });
      if (error) throw error;
      return data as ChecklistDefinition[];
    },
    enabled: !!type,
  });
};

export const useInspections = () => {
  return useQuery({
    queryKey: ['inspections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Inspection[];
    },
  });
};

export const useNonConformities = () => {
  return useQuery({
    queryKey: ['non_conformities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_conformities')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as NonConformity[];
    },
  });
};

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
};

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });
};

export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (board: Omit<Board, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('boards')
        .insert(board)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

export const useUpdateBoard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Board> & { id: string }) => {
      const { data, error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inspection: Omit<Inspection, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('inspections')
        .insert(inspection)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

export const useCreateInspectionItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Omit<InspectionItem, 'id' | 'created_at'>[]) => {
      const { data, error } = await supabase
        .from('inspection_items')
        .insert(items)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection_items'] });
    },
  });
};

export const useCreateNonConformities = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Omit<NonConformity, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from('non_conformities')
        .insert(items)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non_conformities'] });
    },
  });
};

export const useUpdateNonConformity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NonConformity> & { id: string }) => {
      const { data, error } = await supabase
        .from('non_conformities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non_conformities'] });
    },
  });
};

export const useAuth = () => {
  const signUp = async (email: string, password: string, name: string, username: string, role: 'supervisor' | 'tecnico') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, username, role },
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  };

  const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  };

  return { signUp, signIn, signOut, getSession, onAuthStateChange };
};
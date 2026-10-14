-- Add 3 new checklist items to QE-AC definitions
-- Run this in Supabase SQL Editor

INSERT INTO public.checklist_definitions (checklist_type, item_order, label) VALUES
('QE-AC', 14, 'Tubulação'),
('QE-AC', 15, 'Condulete'),
('QE-AC', 16, 'Eletroímã')
ON CONFLICT DO NOTHING;

-- Verify
SELECT item_order, label FROM public.checklist_definitions WHERE checklist_type = 'QE-AC' ORDER BY item_order;

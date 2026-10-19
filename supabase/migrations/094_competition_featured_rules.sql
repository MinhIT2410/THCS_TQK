-- Configurable quick-access rules. NULL = not featured. No existing incident/point changes.
ALTER TABLE public.competition_rules
  ADD COLUMN IF NOT EXISTS featured_student_order smallint,
  ADD COLUMN IF NOT EXISTS featured_unit_order smallint;

-- Columns are read through existing competition_rules SELECT policies.
-- Updates use the existing competition_rules UPDATE policies (COMPETITION_MANAGE).
COMMENT ON COLUMN public.competition_rules.featured_student_order IS 'Quick-access order for student incident form (NULL means hidden)';
COMMENT ON COLUMN public.competition_rules.featured_unit_order IS 'Quick-access order for unit incident form (NULL means hidden)';

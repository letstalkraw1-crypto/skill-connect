-- Skill Connect Platform - Seed Data
-- Seeds the skills table with initial activity categories

INSERT INTO skills (name) VALUES
  ('running'),
  ('cycling'),
  ('swimming'),
  ('gym'),
  ('yoga'),
  ('hiking')
ON CONFLICT (name) DO NOTHING;

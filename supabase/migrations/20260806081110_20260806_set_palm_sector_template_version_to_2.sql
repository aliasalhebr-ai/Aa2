
-- Set palm sector's opportunity_template_version to 2
-- This enables V2 creation via RPC and routes palm sector through the Discovery Engine.
-- V1 opportunities in other palm sub-sectors still render via V1 card mapper within the Discovery Engine
-- (the discovery engine checks per-opportunity template_version).
UPDATE sectors
SET opportunity_template_version = 2
WHERE id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

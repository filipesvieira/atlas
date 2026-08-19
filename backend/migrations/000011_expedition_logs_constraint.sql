-- Migration 000011: Harmonize unique constraints for expedition_logs and compendium
DROP INDEX IF EXISTS expedition_logs_report_key_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS expedition_logs_report_key_uidx ON expedition_logs(report_key);

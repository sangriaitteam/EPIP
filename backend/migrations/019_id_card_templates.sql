-- ═══════════════════════════════════════════════════════════════
-- Migration 019 — Employee ID Card Templates
-- ═══════════════════════════════════════════════════════════════

-- ID Card Templates (created by Admin)
CREATE TABLE IF NOT EXISTS id_card_templates (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  -- Design config stored as JSON
  -- { bgColor, bgGradient, accentColor, textColor, layout, logoPosition, fields[] }
  design_config JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated ID Cards (created by Employee using a template)
CREATE TABLE IF NOT EXISTS employee_id_cards (
  id            SERIAL PRIMARY KEY,
  employee_id   INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id   INT NOT NULL REFERENCES id_card_templates(id) ON DELETE CASCADE,
  -- Employee-filled data
  custom_name        VARCHAR(120),
  custom_designation VARCHAR(100),
  custom_emp_id      VARCHAR(50),
  photo_url          TEXT,
  -- Generated card image URL (after generation)
  card_url           TEXT,
  generated_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_id_card_templates_active ON id_card_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_id_cards_emp    ON employee_id_cards(employee_id);

-- Insert default Sangria template
INSERT INTO id_card_templates (name, description, design_config)
VALUES (
  'Sangria Standard',
  'Official Sangria Edutainment employee ID card template',
  '{
    "bgColor": "#0f172a",
    "bgGradient": "135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%",
    "accentColor": "#6366f1",
    "accentColor2": "#cc0000",
    "textColor": "#ffffff",
    "mutedColor": "rgba(255,255,255,0.5)",
    "layout": "horizontal",
    "showLogo": true,
    "showQR": true,
    "showDepartment": true,
    "showPhone": false,
    "cardWidth": 340,
    "cardHeight": 210
  }'
)
ON CONFLICT DO NOTHING;

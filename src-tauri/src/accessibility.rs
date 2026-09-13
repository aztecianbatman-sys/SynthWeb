#[derive(Debug, Clone, serde::Serialize)]
pub struct AccessibilityAudit {
    pub keyboard_navigation: &'static str,
    pub focus_order: &'static str,
    pub aria_labels: &'static str,
    pub reduced_motion: &'static str,
    pub contrast: &'static str,
    pub high_dpi: &'static str,
    pub text_scaling: &'static str,
    pub screen_reader: &'static str,
    pub manual_audit_required: bool,
}

pub fn current_audit() -> AccessibilityAudit {
    AccessibilityAudit {
        keyboard_navigation: "IMPLEMENTED IN UI",
        focus_order: "IMPLEMENTED IN UI; MANUAL AUDIT PENDING",
        aria_labels: "IMPLEMENTED FOR PRIMARY CONTROLS",
        reduced_motion: "SUPPORTED BY CSS/APP STATE",
        contrast: "DESIGNED FOR DARK/LIGHT THEMES; MANUAL AUDIT PENDING",
        high_dpi: "RESPONSIVE LAYOUT; WINDOWS DPI TEST PENDING",
        text_scaling: "LAYOUT READY; MANUAL TEST PENDING",
        screen_reader: "SEMANTIC LABELS IN PRIMARY UI; MANUAL TEST PENDING",
        manual_audit_required: true,
    }
}

pub fn supported_settings() -> Vec<&'static str> {
    vec!["keyboard-navigation", "reduced-motion", "high-contrast", "text-scaling"]
}

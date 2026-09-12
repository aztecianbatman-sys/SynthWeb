use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TrackerRule {
    pub pattern: String,
    pub category: String,
    pub source: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TrackerStats {
    pub blocked: u64,
    pub allowed: u64,
    pub requests_seen: u64,
    pub measured: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TrackerPolicy {
    pub enabled: bool,
    pub third_party_only: bool,
    pub allowlist: Vec<String>,
    pub blocklist: Vec<String>,
}

pub struct TrackerEngine {
    rules: Vec<TrackerRule>,
    allowlist: HashSet<String>,
    blocklist: HashSet<String>,
    stats: HashMap<String, TrackerStats>,
}

impl TrackerEngine {
    pub fn new(rules: Vec<TrackerRule>, policy: &TrackerPolicy) -> Self {
        Self {
            rules,
            allowlist: policy.allowlist.iter().map(|x| x.to_ascii_lowercase()).collect(),
            blocklist: policy.blocklist.iter().map(|x| x.to_ascii_lowercase()).collect(),
            stats: HashMap::new(),
        }
    }

    pub fn classify(&mut self, origin: &str, request_url: &str) -> bool {
        let origin_key = origin.to_ascii_lowercase();
        let url = request_url.to_ascii_lowercase();
        let stats = self.stats.entry(origin_key.clone()).or_insert(TrackerStats {
            blocked: 0,
            allowed: 0,
            requests_seen: 0,
            measured: true,
        });
        stats.requests_seen += 1;

        if self.allowlist.iter().any(|rule| origin_key.contains(rule) || url.contains(rule)) {
            stats.allowed += 1;
            return false;
        }
        if self.blocklist.iter().any(|rule| url.contains(rule)) {
            stats.blocked += 1;
            return true;
        }
        if let Some(rule) = self.rules.iter().find(|rule| rule.enabled && url.contains(&rule.pattern.to_ascii_lowercase())) {
            stats.blocked += 1;
            let _ = &rule.category;
            return true;
        }

        stats.allowed += 1;
        false
    }

    pub fn stats_for(&self, origin: &str) -> TrackerStats {
        self.stats.get(&origin.to_ascii_lowercase()).cloned().unwrap_or(TrackerStats {
            blocked: 0,
            allowed: 0,
            requests_seen: 0,
            measured: false,
        })
    }

    pub fn measured(&self) -> bool { true }

    pub fn rules(&self) -> &[TrackerRule] { &self.rules }
}

pub fn default_rules() -> Vec<TrackerRule> {
    vec![
        TrackerRule { pattern:"doubleclick.net".into(), category:"advertising".into(), source:"builtin".into(), enabled:true },
        TrackerRule { pattern:"googlesyndication.com".into(), category:"advertising".into(), source:"builtin".into(), enabled:true },
        TrackerRule { pattern:"facebook.net".into(), category:"tracking".into(), source:"builtin".into(), enabled:true },
        TrackerRule { pattern:"connect.facebook.net".into(), category:"tracking".into(), source:"builtin".into(), enabled:true },
        TrackerRule { pattern:"scorecardresearch.com".into(), category:"analytics".into(), source:"builtin".into(), enabled:true },
        TrackerRule { pattern:"hotjar.com".into(), category:"analytics".into(), source:"builtin".into(), enabled:true },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowlist_wins_over_tracker_rule() {
        let policy=TrackerPolicy{enabled:true,third_party_only:false,allowlist:vec!["example.com".into()],blocklist:vec![]};
        let mut e=TrackerEngine::new(default_rules(),&policy);
        assert!(!e.classify("example.com","https://doubleclick.net/pixel"));
    }

    #[test]
    fn measured_block_counter_changes_only_after_classification() {
        let policy=TrackerPolicy{enabled:true,third_party_only:false,allowlist:vec![],blocklist:vec![]};
        let mut e=TrackerEngine::new(default_rules(),&policy);
        assert!(!e.stats_for("example.com").measured);
        assert!(e.classify("example.com","https://doubleclick.net/pixel"));
        assert_eq!(e.stats_for("example.com").blocked,1);
        assert!(e.stats_for("example.com").measured);
    }
}

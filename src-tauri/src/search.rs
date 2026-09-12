use url::Url;

#[derive(Debug, Clone)]
pub enum SearchDecision {
    NewTab,
    Url(Url),
    Search(Url),
}

/// Cortis provider adapter v0.1.
/// URL/domain intent is preserved; free-text is delegated to a real Google
/// web-search URL rather than generating fake local results.
pub fn classify(input: &str) -> Result<SearchDecision, String> {
    let s = input.trim();
    if s.is_empty() || s == "synth://newtab" {
        return Ok(SearchDecision::NewTab);
    }

    if let Ok(u) = Url::parse(s) {
        if matches!(u.scheme(), "http" | "https") {
            return Ok(SearchDecision::Url(u));
        }
    }

    if s.contains('.') && !s.contains(' ') {
        let u = Url::parse(&format!("https://{s}")).map_err(|e| e.to_string())?;
        return Ok(SearchDecision::Url(u));
    }

    let mut encoded = String::with_capacity(s.len());
    for b in s.as_bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => encoded.push(*b as char),
            b' ' => encoded.push('+'),
            _ => encoded.push_str(&format!("%{b:02X}")),
        }
    }

    let u = Url::parse(&format!("https://www.google.com/search?q={encoded}")).map_err(|e| e.to_string())?;
    Ok(SearchDecision::Search(u))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_stays_a_url() {
        assert!(matches!(classify("https://example.com").unwrap(), SearchDecision::Url(_)));
    }

    #[test]
    fn domain_gets_https() {
        match classify("example.com").unwrap() {
            SearchDecision::Url(u) => assert_eq!(u.as_str(), "https://example.com/"),
            _ => panic!("expected URL"),
        }
    }

    #[test]
    fn search_is_real_provider_delegation() {
        match classify("rust tauri").unwrap() {
            SearchDecision::Search(u) => assert_eq!(u.as_str(), "https://www.google.com/search?q=rust+tauri"),
            _ => panic!("expected search"),
        }
    }
}

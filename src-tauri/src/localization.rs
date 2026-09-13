use std::collections::HashMap;

pub fn supported_locales() -> Vec<&'static str> {
    vec!["en-US"]
}

pub fn normalize(locale: &str) -> &'static str {
    if locale.eq_ignore_ascii_case("en-us") || locale.eq_ignore_ascii_case("en") {
        "en-US"
    } else {
        "en-US"
    }
}

pub fn strings(locale: &str) -> HashMap<&'static str, &'static str> {
    let _ = normalize(locale);
    HashMap::from([
        ("app.name", "Synth Browser"),
        ("app.tagline", "Private by default."),
        ("nav.home", "Home"),
        ("nav.assist", "Synth Assist"),
        ("nav.shield", "Shield"),
        ("nav.bookmarks", "Bookmarks"),
        ("nav.history", "History"),
        ("nav.downloads", "Downloads"),
        ("nav.profiles", "Profiles"),
        ("nav.extensions", "Extensions"),
        ("nav.tools", "Browser Tools"),
        ("nav.settings", "Settings"),
        ("shield.title", "Synth Shield"),
        ("assist.title", "Synth Assist"),
    ])
}

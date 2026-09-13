#include "azecotron/app/synth_tracker_rules.h"

#include <fstream>
#include <sstream>

#include "base/json/json_reader.h"
#include "base/values.h"

namespace synth_azecotron {

std::vector<TrackerRule> LoadTrackerRules(const std::string& path) {
  std::vector<TrackerRule> rules;
  std::ifstream file(path);
  if (!file)
    return rules;

  std::stringstream buffer;
  buffer << file.rdbuf();
  auto value = base::JSONReader::Read(buffer.str());
  if (!value || !value->is_dict())
    return rules;

  const base::Value::List* list = value->GetDict().FindList("rules");
  if (!list)
    return rules;

  for (const auto& item : *list) {
    if (!item.is_dict())
      continue;
    const auto* pattern = item.GetDict().FindString("pattern");
    const auto* category = item.GetDict().FindString("category");
    const bool enabled = item.GetDict().FindBool("enabled").value_or(true);
    if (!pattern || !category || pattern->empty())
      continue;
    rules.push_back(TrackerRule{*pattern, *category, enabled});
  }
  return rules;
}

bool IsTrackerHost(const std::vector<TrackerRule>& rules,
                   const std::string& host) {
  for (const auto& rule : rules) {
    if (!rule.enabled)
      continue;
    if (host == rule.pattern ||
        (host.size() > rule.pattern.size() &&
         host.ends_with("." + rule.pattern))) {
      return true;
    }
  }
  return false;
}

}  // namespace synth_azecotron

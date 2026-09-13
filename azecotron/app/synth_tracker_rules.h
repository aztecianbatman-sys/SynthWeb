#ifndef SYNTH_AZECOTRON_SYNTH_TRACKER_RULES_H_
#define SYNTH_AZECOTRON_SYNTH_TRACKER_RULES_H_

#include <string>
#include <vector>

namespace synth_azecotron {

struct TrackerRule {
  std::string pattern;
  std::string category;
  bool enabled = true;
};

std::vector<TrackerRule> LoadTrackerRules(const std::string& path);
bool IsTrackerHost(const std::vector<TrackerRule>& rules, const std::string& host);

}  // namespace synth_azecotron

#endif

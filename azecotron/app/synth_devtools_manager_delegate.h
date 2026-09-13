#ifndef SYNTH_AZECOTRON_SYNTH_DEVTOOLS_MANAGER_DELEGATE_H_
#define SYNTH_AZECOTRON_SYNTH_DEVTOOLS_MANAGER_DELEGATE_H_

#include "content/public/browser/devtools_manager_delegate.h"

namespace synth_azecotron {

class SynthDevToolsManagerDelegate final
    : public content::DevToolsManagerDelegate {
 public:
  SynthDevToolsManagerDelegate() = default;
  SynthDevToolsManagerDelegate(const SynthDevToolsManagerDelegate&) = delete;
  SynthDevToolsManagerDelegate& operator=(const SynthDevToolsManagerDelegate&) = delete;
  ~SynthDevToolsManagerDelegate() override = default;

  void Inspect(content::DevToolsAgentHost* agent_host) override;
  std::string GetTargetType(content::WebContents* web_contents) override;
  std::string GetTargetTitle(content::WebContents* web_contents) override;
  std::string GetTargetDescription(content::WebContents* web_contents) override;
  bool AllowInspectingTarget(content::DevToolsAgentHost* agent_host) override;
  bool IsBrowserTargetDiscoverable() override;
};

}  // namespace synth_azecotron

#endif

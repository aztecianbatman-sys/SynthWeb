#ifndef SYNTH_AZECOTRON_SYNTH_DEVTOOLS_DELEGATE_H_
#define SYNTH_AZECOTRON_SYNTH_DEVTOOLS_DELEGATE_H_

#include "content/public/browser/devtools_manager_delegate.h"

namespace synth_azecotron {

class SynthDevToolsDelegate final : public content::DevToolsManagerDelegate {
 public:
  SynthDevToolsDelegate() = default;
  SynthDevToolsDelegate(const SynthDevToolsDelegate&) = delete;
  SynthDevToolsDelegate& operator=(const SynthDevToolsDelegate&) = delete;
  ~SynthDevToolsDelegate() override = default;

  std::string GetTargetType(content::WebContents* web_contents) override;
  std::string GetTargetTitle(content::WebContents* web_contents) override;
  bool AllowInspectingRenderFrameHost(
      content::RenderFrameHost* render_frame_host) override;
  DevToolsAgentHost::List RemoteDebuggingTargets() override;
  bool IsBrowserTargetDiscoverable() override;
};

}  // namespace synth_azecotron

#endif

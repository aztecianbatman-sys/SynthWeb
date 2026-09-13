#include "azecotron/app/synth_devtools_delegate.h"

#include "base/strings/utf_string_conversions.h"
#include "content/public/browser/devtools_agent_host.h"
#include "content/public/browser/web_contents.h"

namespace synth_azecotron {

std::string SynthDevToolsDelegate::GetTargetType(
    content::WebContents*) {
  return "page";
}

std::string SynthDevToolsDelegate::GetTargetTitle(
    content::WebContents* web_contents) {
  return web_contents ? base::UTF16ToUTF8(web_contents->GetTitle()) : "";
}

bool SynthDevToolsDelegate::AllowInspectingRenderFrameHost(
    content::RenderFrameHost*) {
  return true;
}

content::DevToolsAgentHost::List
SynthDevToolsDelegate::RemoteDebuggingTargets() {
  return content::DevToolsAgentHost::GetOrCreateAll();
}

bool SynthDevToolsDelegate::IsBrowserTargetDiscoverable() {
  return false;
}

}  // namespace synth_azecotron

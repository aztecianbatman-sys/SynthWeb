#include "azecotron/app/synth_devtools_manager_delegate.h"

#include <iostream>

#include "base/json/json_writer.h"
#include "base/strings/utf_string_conversions.h"
#include "base/values.h"
#include "content/public/browser/devtools_agent_host.h"
#include "content/public/browser/web_contents.h"

namespace synth_azecotron {

void SynthDevToolsManagerDelegate::Inspect(
    content::DevToolsAgentHost* agent_host) {
  if (!agent_host)
    return;

  base::Value::Dict event;
  event.Set("type", "devtools-inspect");
  event.Set("target_id", agent_host->GetId());
  event.Set("title", agent_host->GetTitle());
  event.Set("url", agent_host->GetURL().spec());

  std::string json;
  base::JSONWriter::Write(event, &json);
  std::cout << "SYNTH_EVENT " << json << std::endl;
}

std::string SynthDevToolsManagerDelegate::GetTargetType(
    content::WebContents*) {
  return "page";
}

std::string SynthDevToolsManagerDelegate::GetTargetTitle(
    content::WebContents* web_contents) {
  return web_contents ? base::UTF16ToUTF8(web_contents->GetTitle()) : "Synth Browser";
}

std::string SynthDevToolsManagerDelegate::GetTargetDescription(
    content::WebContents* web_contents) {
  if (!web_contents)
    return {};
  return web_contents->GetLastCommittedURL().spec();
}

bool SynthDevToolsManagerDelegate::AllowInspectingTarget(
    content::DevToolsAgentHost*) {
  return true;
}

bool SynthDevToolsManagerDelegate::IsBrowserTargetDiscoverable() {
  return false;
}

}  // namespace synth_azecotron

#include "azecotron/app/synth_content_browser_client.h"

#include <vector>

#include "azecotron/app/synth_browser_main_parts.h"
#include "azecotron/app/synth_tracker_throttle.h"
#include "azecotron/app/synth_devtools_manager_delegate.h"
#include "content/public/browser/browser_main_parts.h"
#include "content/public/browser/browser_context.h"
#include "content/public/browser/devtools_manager_delegate.h"
#include "services/network/public/cpp/resource_request.h"
#include "third_party/blink/public/common/loader/url_loader_throttle.h"

namespace synth_azecotron {

namespace { SynthContentBrowserClient* g_instance = nullptr; }

SynthContentBrowserClient::SynthContentBrowserClient() { g_instance = this; }

SynthContentBrowserClient::~SynthContentBrowserClient() {
  g_instance = nullptr;
}

SynthContentBrowserClient* SynthContentBrowserClient::Get() {
  return g_instance;
}

content::BrowserContext* SynthContentBrowserClient::GetBrowserContext() const {
  return browser_main_parts_ ? browser_main_parts_->browser_context() : nullptr;
}

std::unique_ptr<content::BrowserMainParts>
SynthContentBrowserClient::CreateBrowserMainParts(
    const content::MainFunctionParams& parameters) {
  auto parts = std::make_unique<SynthBrowserMainParts>(parameters);
  browser_main_parts_ = parts.get();
  return parts;
}

std::unique_ptr<content::WebContentsViewDelegate>
SynthContentBrowserClient::GetWebContentsViewDelegate(
    content::WebContents*) {
  return nullptr;
}

content::DevToolsManagerDelegate*
SynthContentBrowserClient::GetDevToolsManagerDelegate() {
  if (!devtools_delegate_)
    devtools_delegate_ = std::make_unique<SynthDevToolsManagerDelegate>();
  return devtools_delegate_.get();
}

std::vector<std::unique_ptr<blink::URLLoaderThrottle>>
SynthContentBrowserClient::CreateURLLoaderThrottles(
    const network::ResourceRequest&,
    content::BrowserContext*,
    const base::RepeatingCallback<content::WebContents*()>&,
    content::NavigationUIData*,
    content::FrameTreeNodeId,
    std::optional<int64_t>) {
  std::vector<std::unique_ptr<blink::URLLoaderThrottle>> throttles;
  throttles.push_back(synth_azecotron::CreateSynthTrackerThrottle());
  return throttles;
}

}  // namespace synth_azecotron

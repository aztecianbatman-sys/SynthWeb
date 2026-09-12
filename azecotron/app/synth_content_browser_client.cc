#include "azecotron/app/synth_content_browser_client.h"

#include "azecotron/app/synth_browser_main_parts.h"
#include "content/public/browser/browser_main_parts.h"
#include "content/public/browser/browser_context.h"
#include "content/public/browser/devtools_manager_delegate.h"

namespace synth_azecotron {

SynthContentBrowserClient::SynthContentBrowserClient() = default;

SynthContentBrowserClient::~SynthContentBrowserClient() = default;

content::BrowserContext* SynthContentBrowserClient::GetBrowserContext() const {
  return browser_main_parts_ ? browser_main_parts_->browser_context() : nullptr;
}

std::unique_ptr<content::BrowserMainParts>
SynthContentBrowserClient::CreateBrowserMainParts(
    const content::MainFunctionParams& parameters) {
  auto parts = std::make_unique<SynthBrowserMainParts>();
  browser_main_parts_ = parts.get();
  return parts;
}

std::unique_ptr<content::WebContentsViewDelegate>
SynthContentBrowserClient::GetWebContentsViewDelegate(
    content::WebContents*) {
  return nullptr;
}

std::unique_ptr<content::DevToolsManagerDelegate>
SynthContentBrowserClient::CreateDevToolsManagerDelegate() {
  return nullptr;
}

}  // namespace synth_azecotron

#include "azecotron/app/synth_content_browser_client.h"

#include "azecotron/app/synth_browser_main_parts.h"
#include "content/public/browser/browser_main_parts.h"
#include "content/public/browser/browser_context.h"
#include "content/public/browser/devtools_manager_delegate.h"

namespace synth_azecotron {
namespace { SynthContentBrowserClient* g_instance = nullptr; }

SynthContentBrowserClient::SynthContentBrowserClient() { g_instance = this; }

SynthContentBrowserClient::~SynthContentBrowserClient() { g_instance = nullptr; }

SynthContentBrowserClient* SynthContentBrowserClient::Get() { return g_instance; }

content::BrowserContext* SynthContentBrowserClient::GetBrowserContext() const {
  return browser_main_parts_ ? browser_main_parts_->browser_context() : nullptr;
}

std::unique_ptr<content::BrowserMainParts>
SynthContentBrowserClient::CreateBrowserMainParts(bool) {
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

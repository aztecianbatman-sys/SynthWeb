#include "azecotron/app/synth_browser_context.h"
#include "components/keyed_service/content/browser_context_dependency_manager.h"

namespace synth_azecotron {

SynthBrowserContext::SynthBrowserContext(
    bool off_the_record,
    const base::FilePath& path)
    : content::ShellBrowserContext(off_the_record, true),
      path_(path) {
  content::BrowserContextDependencyManager::GetInstance()->CreateBrowserContextServices(this);
}

SynthBrowserContext::~SynthBrowserContext() = default;

base::FilePath SynthBrowserContext::GetPath() {
  return path_;
}

}  // namespace synth_azecotron

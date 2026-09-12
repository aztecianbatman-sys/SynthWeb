#include "azecotron/app/synth_browser_context.h"

namespace synth_azecotron {

SynthBrowserContext::SynthBrowserContext(
    bool off_the_record,
    const base::FilePath& path)
    : content::ShellBrowserContext(off_the_record, true),
      path_(path) {
  content::ShellBrowserContext::CreateBrowserContextServices(this);
}

SynthBrowserContext::~SynthBrowserContext() = default;

base::FilePath SynthBrowserContext::GetPath() {
  return path_;
}

}  // namespace synth_azecotron

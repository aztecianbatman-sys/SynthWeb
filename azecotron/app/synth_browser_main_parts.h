#ifndef SYNTH_AZECOTRON_SYNTH_BROWSER_MAIN_PARTS_H_
#define SYNTH_AZECOTRON_SYNTH_BROWSER_MAIN_PARTS_H_

#include "content/shell/browser/shell_browser_main_parts.h"

namespace synth_azecotron {

class SynthBrowserContext;

class SynthBrowserMainParts final : public content::ShellBrowserMainParts {
 public:
  SynthBrowserMainParts();
  SynthBrowserMainParts(const SynthBrowserMainParts&) = delete;
  SynthBrowserMainParts& operator=(const SynthBrowserMainParts&) = delete;
  ~SynthBrowserMainParts() override;

 protected:
  void InitializeBrowserContexts() override;
  void InitializeMessageLoopContext() override;

 private:
  raw_ptr<SynthBrowserContext> synth_browser_context_ = nullptr;
};

}  // namespace synth_azecotron

#endif

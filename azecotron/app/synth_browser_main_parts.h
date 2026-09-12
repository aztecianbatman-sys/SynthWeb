#ifndef SYNTH_AZECOTRON_SYNTH_BROWSER_MAIN_PARTS_H_
#define SYNTH_AZECOTRON_SYNTH_BROWSER_MAIN_PARTS_H_

#include "base/memory/raw_ptr.h"
#include "content/public/browser/browser_main_parts.h"

namespace content {
class MainFunctionParams;
}

namespace synth_azecotron {

class SynthBrowserContext;

class SynthBrowserMainParts final : public content::BrowserMainParts {
 public:
  explicit SynthBrowserMainParts(
      const content::MainFunctionParams& parameters);
  SynthBrowserMainParts(const SynthBrowserMainParts&) = delete;
  SynthBrowserMainParts& operator=(const SynthBrowserMainParts&) = delete;
  ~SynthBrowserMainParts() override;

  content::BrowserContext* browser_context() const {
    return browser_context_;
  }

 protected:
  int PreMainMessageLoopRun() override;
  void PostMainMessageLoopRun() override;

 private:
  void InitializeBrowserContexts();

  const content::MainFunctionParams& parameters_;
  std::unique_ptr<SynthBrowserContext> browser_context_;
  std::unique_ptr<SynthBrowserContext> off_the_record_browser_context_;
};

}  // namespace synth_azecotron

#endif

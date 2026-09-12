#ifndef SYNTH_AZECOTRON_SYNTH_CONTENT_BROWSER_CLIENT_H_
#define SYNTH_AZECOTRON_SYNTH_CONTENT_BROWSER_CLIENT_H_

#include <memory>

#include "content/public/browser/content_browser_client.h"

namespace synth_azecotron {

class SynthBrowserMainParts;

class SynthContentBrowserClient final : public content::ContentBrowserClient {
 public:
  SynthContentBrowserClient();
  SynthContentBrowserClient(const SynthContentBrowserClient&) = delete;
  SynthContentBrowserClient& operator=(const SynthContentBrowserClient&) = delete;
  ~SynthContentBrowserClient() override;

  static SynthContentBrowserClient* Get();
  content::BrowserContext* GetBrowserContext() const;
  SynthBrowserMainParts* browser_main_parts() const { return browser_main_parts_.get(); }

 private:
  std::unique_ptr<content::BrowserMainParts> CreateBrowserMainParts(
      const content::MainFunctionParams& parameters) override;

  std::unique_ptr<content::WebContentsViewDelegate> GetWebContentsViewDelegate(
      content::WebContents* web_contents) override;

  std::unique_ptr<content::DevToolsManagerDelegate>
  CreateDevToolsManagerDelegate() override;

  raw_ptr<SynthBrowserMainParts> browser_main_parts_ = nullptr;
};

}  // namespace synth_azecotron

#endif

#ifndef SYNTH_AZECOTRON_SYNTH_CONTENT_MAIN_DELEGATE_H_
#define SYNTH_AZECOTRON_SYNTH_CONTENT_MAIN_DELEGATE_H_

#include <memory>

#include "content/public/app/content_main_delegate.h"

namespace content {
class ContentBrowserClient;
class ContentGpuClient;
class ContentRendererClient;
class ContentUtilityClient;
class ContentClient;
}

namespace synth_azecotron {

class SynthContentMainDelegate final : public content::ContentMainDelegate {
 public:
  SynthContentMainDelegate();
  SynthContentMainDelegate(const SynthContentMainDelegate&) = delete;
  SynthContentMainDelegate& operator=(const SynthContentMainDelegate&) = delete;
  ~SynthContentMainDelegate() override;

  content::ContentClient* CreateContentClient() override;
  content::ContentBrowserClient* CreateContentBrowserClient() override;
  content::ContentGpuClient* CreateContentGpuClient() override;
  content::ContentRendererClient* CreateContentRendererClient() override;
  content::ContentUtilityClient* CreateContentUtilityClient() override;

 private:
  std::unique_ptr<content::ContentClient> content_client_;
  std::unique_ptr<content::ContentBrowserClient> browser_client_;
  std::unique_ptr<content::ContentGpuClient> gpu_client_;
  std::unique_ptr<content::ContentRendererClient> renderer_client_;
  std::unique_ptr<content::ContentUtilityClient> utility_client_;
};

}  // namespace synth_azecotron

#endif

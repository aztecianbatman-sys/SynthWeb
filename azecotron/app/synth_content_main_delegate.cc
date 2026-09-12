#include "azecotron/app/synth_content_main_delegate.h"

#include "azecotron/app/synth_content_browser_client.h"
#include "content/public/browser/content_browser_client.h"
#include "content/public/common/content_client.h"

namespace synth_azecotron {

SynthContentMainDelegate::SynthContentMainDelegate() = default;

SynthContentMainDelegate::~SynthContentMainDelegate() = default;

content::ContentClient* SynthContentMainDelegate::CreateContentClient() {
  content_client_ = std::make_unique<content::ContentClient>();
  return content_client_.get();
}

content::ContentBrowserClient*
SynthContentMainDelegate::CreateContentBrowserClient() {
  browser_client_ = std::make_unique<SynthContentBrowserClient>();
  return browser_client_.get();
}

content::ContentGpuClient* SynthContentMainDelegate::CreateContentGpuClient() {
  gpu_client_ = std::make_unique<content::ContentGpuClient>();
  return gpu_client_.get();
}

content::ContentRendererClient*
SynthContentMainDelegate::CreateContentRendererClient() {
  renderer_client_ = std::make_unique<content::ContentRendererClient>();
  return renderer_client_.get();
}

content::ContentUtilityClient*
SynthContentMainDelegate::CreateContentUtilityClient() {
  utility_client_ = std::make_unique<content::ContentUtilityClient>();
  return utility_client_.get();
}

}  // namespace synth_azecotron

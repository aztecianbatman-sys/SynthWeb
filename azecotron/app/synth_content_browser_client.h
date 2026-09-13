#ifndef SYNTH_AZECOTRON_SYNTH_CONTENT_BROWSER_CLIENT_H_
#define SYNTH_AZECOTRON_SYNTH_CONTENT_BROWSER_CLIENT_H_

#include <memory>

#include <optional>
#include <vector>

#include "base/callback_forward.h"
#include "base/memory/raw_ptr.h"

#include "content/public/browser/content_browser_client.h"
#include "third_party/blink/public/common/loader/url_loader_throttle.h"

namespace network { struct ResourceRequest; }

namespace content { class MainFunctionParams; }

namespace synth_azecotron {

class SynthBrowserMainParts;
class SynthDevToolsManagerDelegate;

class SynthContentBrowserClient final : public content::ContentBrowserClient {
 public:
  SynthContentBrowserClient();
  SynthContentBrowserClient(const SynthContentBrowserClient&) = delete;
  SynthContentBrowserClient& operator=(const SynthContentBrowserClient&) = delete;
  ~SynthContentBrowserClient() override;

  static SynthContentBrowserClient* Get();
  content::BrowserContext* GetBrowserContext() const;
  SynthBrowserMainParts* browser_main_parts() const { return browser_main_parts_; }

 private:
  std::unique_ptr<content::BrowserMainParts> CreateBrowserMainParts(
      const content::MainFunctionParams& parameters) override;

  std::unique_ptr<content::WebContentsViewDelegate> GetWebContentsViewDelegate(
      content::WebContents* web_contents) override;

  content::DevToolsManagerDelegate* GetDevToolsManagerDelegate() override;

  std::vector<std::unique_ptr<blink::URLLoaderThrottle>>
  CreateURLLoaderThrottles(
      const network::ResourceRequest& request,
      content::BrowserContext* browser_context,
      const base::RepeatingCallback<content::WebContents*()>& wc_getter,
      content::NavigationUIData* navigation_ui_data,
      content::FrameTreeNodeId frame_tree_node_id,
      std::optional<int64_t> navigation_id) override;

  raw_ptr<SynthBrowserMainParts> browser_main_parts_ = nullptr;
  std::unique_ptr<SynthDevToolsManagerDelegate> devtools_delegate_;
};

}  // namespace synth_azecotron

#endif

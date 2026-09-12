#ifndef SYNTH_AZECOTRON_RUNTIME_HOST_H_
#define SYNTH_AZECOTRON_RUNTIME_HOST_H_

#include <memory>
#include <string>

#include "content/public/browser/web_contents_delegate.h"
#include "content/public/browser/web_contents_observer.h"

class GURL;

namespace content {
class BrowserContext;
class WebContents;
}

namespace synth_azecotron {

class AzecotronRuntimeHost final : public content::WebContentsDelegate,
                                   public content::WebContentsObserver {
 public:
  explicit AzecotronRuntimeHost(content::BrowserContext* browser_context);
  AzecotronRuntimeHost(const AzecotronRuntimeHost&) = delete;
  AzecotronRuntimeHost& operator=(const AzecotronRuntimeHost&) = delete;
  ~AzecotronRuntimeHost() override;

  std::unique_ptr<content::WebContents> CreateTab(const GURL& url);
  bool Navigate(content::WebContents* web_contents, const GURL& url);
  bool GoBack(content::WebContents* web_contents);
  bool GoForward(content::WebContents* web_contents);
  bool Reload(content::WebContents* web_contents);
  void Stop(content::WebContents* web_contents);
  std::string GetUrl(content::WebContents* web_contents) const;
  std::string GetTitle(content::WebContents* web_contents) const;

  bool IsWebContentsCreationOverridden(
      content::RenderFrameHost* opener,
      content::SiteInstance* source_site_instance,
      content::mojom::WindowContainerType window_container_type,
      const GURL& opener_url,
      const std::string& frame_name,
      const GURL& target_url) override;

  content::WebContents* CreateCustomWebContents(
      content::RenderFrameHost* opener,
      content::SiteInstance* source_site_instance,
      bool is_new_browsing_instance,
      const GURL& opener_url,
      const std::string& frame_name,
      const GURL& target_url,
      const content::StoragePartitionConfig& partition_config,
      content::SessionStorageNamespace* session_storage_namespace) override;

  void RendererUnresponsive(content::WebContents* source) override;
  void RendererResponsive(content::WebContents* source) override;
  void DidNavigateMainFramePostCommit(content::WebContents* source) override;

 private:
  raw_ptr<content::BrowserContext> browser_context_;
};

}  // namespace synth_azecotron

#endif  // SYNTH_AZECOTRON_RUNTIME_HOST_H_

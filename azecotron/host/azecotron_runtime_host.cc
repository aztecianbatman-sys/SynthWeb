#include "azecotron/host/azecotron_runtime_host.h"

#include "content/public/browser/navigation_controller.h"
#include "content/public/browser/session_storage_namespace.h"
#include "content/public/browser/web_contents.h"
#include "url/gurl.h"

namespace synth_azecotron {

AzecotronRuntimeHost::AzecotronRuntimeHost(
    content::BrowserContext* browser_context)
    : browser_context_(browser_context) {}

AzecotronRuntimeHost::~AzecotronRuntimeHost() = default;

std::unique_ptr<content::WebContents> AzecotronRuntimeHost::CreateTab(
    const GURL& url) {
  content::WebContents::CreateParams params(browser_context_);
  auto contents = content::WebContents::Create(params);
  if (!contents)
    return nullptr;

  contents->SetDelegate(this);
  Observe(contents.get());

  if (url.is_valid()) {
    content::NavigationController::LoadURLParams load(url);
    load.transition_type = ui::PAGE_TRANSITION_TYPED;
    contents->GetController().LoadURLWithParams(load);
  }
  return contents;
}

bool AzecotronRuntimeHost::Navigate(content::WebContents* web_contents,
                                     const GURL& url) {
  if (!web_contents || !url.is_valid())
    return false;

  content::NavigationController::LoadURLParams load(url);
  load.transition_type = ui::PAGE_TRANSITION_TYPED;
  web_contents->GetController().LoadURLWithParams(load);
  return true;
}

bool AzecotronRuntimeHost::GoBack(content::WebContents* web_contents) {
  if (!web_contents || !web_contents->GetController().CanGoBack())
    return false;
  web_contents->GetController().GoBack();
  return true;
}

bool AzecotronRuntimeHost::GoForward(content::WebContents* web_contents) {
  if (!web_contents || !web_contents->GetController().CanGoForward())
    return false;
  web_contents->GetController().GoForward();
  return true;
}

bool AzecotronRuntimeHost::Reload(content::WebContents* web_contents) {
  if (!web_contents)
    return false;
  web_contents->GetController().Reload(content::ReloadType::NORMAL, false);
  return true;
}

void AzecotronRuntimeHost::Stop(content::WebContents* web_contents) {
  if (web_contents)
    web_contents->Stop();
}

std::string AzecotronRuntimeHost::GetUrl(
    content::WebContents* web_contents) const {
  if (!web_contents)
    return {};
  return web_contents->GetLastCommittedURL().spec();
}

std::string AzecotronRuntimeHost::GetTitle(
    content::WebContents* web_contents) const {
  if (!web_contents)
    return {};
  return web_contents->GetTitle();
}

bool AzecotronRuntimeHost::IsWebContentsCreationOverridden(
    content::RenderFrameHost*,
    content::SiteInstance*,
    content::mojom::WindowContainerType,
    const GURL&,
    const std::string&,
    const GURL&) {
  return true;
}

content::WebContents* AzecotronRuntimeHost::CreateCustomWebContents(
    content::RenderFrameHost*,
    content::SiteInstance* source_site_instance,
    bool,
    const GURL&,
    const std::string&,
    const GURL& target_url,
    const content::StoragePartitionConfig&,
    content::SessionStorageNamespace* session_storage_namespace) {
  content::WebContents::CreateParams params(browser_context_,
                                             source_site_instance);
  params.initial_url = target_url;

  auto child = content::WebContents::CreateWithSessionStorage(
      params, {{std::string(), session_storage_namespace}});
  if (!child)
    return nullptr;

  child->SetDelegate(this);
  Observe(child.get());
  return child.release();
}

void AzecotronRuntimeHost::RendererUnresponsive(content::WebContents*) {}
void AzecotronRuntimeHost::RendererResponsive(content::WebContents*) {}
void AzecotronRuntimeHost::DidNavigateMainFramePostCommit(
    content::WebContents*) {}

}  // namespace synth_azecotron

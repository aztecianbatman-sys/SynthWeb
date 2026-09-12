#include "azecotron/host/azecotron_runtime_host.h"
#include "azecotron/host/azecotron_tab_observer.h"
#include "build/build_config.h"
#include "base/json/json_writer.h"
#include "base/values.h"

#include "content/public/browser/navigation_controller.h"
#include "content/public/browser/session_storage_namespace.h"
#include "content/public/browser/web_contents.h"
#include "base/strings/utf_string_conversions.h"
#include "url/gurl.h"
#include "content/public/browser/navigation_handle.h"
#include <iostream>
#include "base/command_line.h"

#if BUILDFLAG(IS_WIN)
#include <windows.h>
#include <cstdlib>
#include "ui/gfx/native_widget_types.h"
#endif

namespace synth_azecotron {

AzecotronRuntimeHost::AzecotronRuntimeHost(
    content::BrowserContext* browser_context)
    : browser_context_(browser_context) {
#if BUILDFLAG(IS_WIN)
  const std::string parent =
      base::CommandLine::ForCurrentProcess()->GetSwitchValueASCII("synth-parent-hwnd");
  if (!parent.empty()) {
    parent_hwnd_ = static_cast<uintptr_t>(
        std::strtoull(parent.c_str(), nullptr, 10));
  }
#endif
  tab_id_ = base::CommandLine::ForCurrentProcess()->GetSwitchValueASCII("synth-tab-id");
}

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
#if BUILDFLAG(IS_WIN)
  AttachNativeView(contents.get());
#endif
  return contents;
}

bool AzecotronRuntimeHost::AdoptWebContents(
    std::unique_ptr<content::WebContents> web_contents,
    const GURL& url) {
  if (!web_contents)
    return false;

  primary_web_contents_ = std::move(web_contents);
  content::WebContents* raw = primary_web_contents_.get();
  raw->SetDelegate(this);
  observers_.push_back(std::make_unique<AzecotronTabObserver>(raw, tab_id_, "primary"));
  AttachNativeView(raw);

  if (url.is_valid()) {
    content::NavigationController::LoadURLParams load(url);
    load.transition_type = ui::PAGE_TRANSITION_TYPED;
    raw->GetController().LoadURLWithParams(load);
  }
  return true;
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
  return base::UTF16ToUTF8(web_contents->GetTitle());
}

void* AzecotronRuntimeHost::GetNativeViewForEmbedding() const {
  if (!primary_web_contents_)
    return nullptr;
  return static_cast<void*>(primary_web_contents_->GetNativeView());
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
  observers_.push_back(std::make_unique<AzecotronTabObserver>(child.get(), tab_id_, "popup"));
  AttachNativeView(child.get());
  return child.release();
}

void AzecotronRuntimeHost::RendererUnresponsive(content::WebContents* source, content::RenderWidgetHost*, base::RepeatingClosure) {
  EmitEvent("renderer-unresponsive", source);
}
void AzecotronRuntimeHost::RendererResponsive(content::WebContents* source, content::RenderWidgetHost*) {
  EmitEvent("renderer-responsive", source);
}
void AzecotronRuntimeHost::DidNavigateMainFramePostCommit(
    content::WebContents*) {}

void AzecotronRuntimeHost::AttachNativeView(content::WebContents* web_contents) {
#if BUILDFLAG(IS_WIN)
  if (!web_contents || !parent_hwnd_ || !web_contents->GetNativeView())
    return;

  HWND parent = reinterpret_cast<HWND>(parent_hwnd_);
  HWND child = web_contents->GetNativeView();
  SetParent(child, parent);

  RECT rect{};
  GetClientRect(parent, &rect);
  SetWindowPos(child, HWND_TOP, 0, 0, rect.right - rect.left,
               rect.bottom - rect.top,
               SWP_NOACTIVATE | SWP_SHOWWINDOW);
#else
  (void)web_contents;
#endif
}

}  // namespace synth_azecotron

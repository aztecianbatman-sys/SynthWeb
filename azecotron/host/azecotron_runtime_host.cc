#include "azecotron/host/azecotron_runtime_host.h"
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

void AzecotronRuntimeHost::EmitEvent(
    const char* type,
    content::WebContents* source,
    const std::string& extra_key,
    const std::string& extra_value) const {
  base::Value::Dict dict;
  dict.Set("type", type);
  dict.Set("url", source ? source->GetLastCommittedURL().spec() : "");
  dict.Set("title", source ? base::UTF16ToUTF8(source->GetTitle()) : "");
  if (!extra_key.empty())
    dict.Set(extra_key, extra_value);

  std::string json;
  base::JSONWriter::Write(dict, &json);
  std::cout << "SYNTH_EVENT " << json << std::endl;
}

void AzecotronRuntimeHost::DidFinishNavigation(
    content::NavigationHandle* navigation_handle) {
  if (!navigation_handle || !navigation_handle->HasCommitted() ||
      !navigation_handle->IsInPrimaryMainFrame()) {
    return;
  }
  EmitEvent("navigation", web_contents(),
            "same_document",
            navigation_handle->IsSameDocument() ? "true" : "false");
}

void AzecotronRuntimeHost::DidStartLoading() {
  EmitEvent("loading-start", web_contents());
}

void AzecotronRuntimeHost::DidStopLoading() {
  EmitEvent("loading-stop", web_contents());
}

void AzecotronRuntimeHost::DidChangeVisibleSecurityState() {
  if (!web_contents())
    return;
  EmitEvent("security", web_contents(), "secure",
            web_contents()->GetLastCommittedURL().SchemeIsCryptographic()
                ? "true" : "false");
}

}  // namespace synth_azecotron

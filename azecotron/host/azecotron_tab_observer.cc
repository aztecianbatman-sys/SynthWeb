#include "azecotron/host/azecotron_tab_observer.h"

#include <iostream>

#include "base/json/json_writer.h"
#include "base/strings/utf_string_conversions.h"
#include "base/values.h"
#include "content/public/browser/web_contents.h"

namespace synth_azecotron {

AzecotronTabObserver::AzecotronTabObserver(
    content::WebContents* web_contents,
    std::string tab_id,
    std::string role)
    : content::WebContentsObserver(web_contents),
      tab_id_(std::move(tab_id)),
      role_(std::move(role)) {}

AzecotronTabObserver::~AzecotronTabObserver() = default;

void AzecotronTabObserver::Emit(
    const char* type,
    const std::string& extra_key,
    const std::string& extra_value) const {
  base::Value::Dict dict;
  dict.Set("type", type);
  dict.Set("tab_id", tab_id_);
  dict.Set("role", role_);
  if (web_contents()) {
    dict.Set("url", web_contents()->GetLastCommittedURL().spec());
    dict.Set("title", base::UTF16ToUTF8(web_contents()->GetTitle()));
  }
  if (!extra_key.empty())
    dict.Set(extra_key, extra_value);

  std::string json;
  base::JSONWriter::Write(dict, &json);
  std::cout << "SYNTH_EVENT " << json << std::endl;
}

void AzecotronTabObserver::DidStartLoading() {
  Emit("loading-start");
}

void AzecotronTabObserver::DidStopLoading() {
  Emit("loading-stop");
}

void AzecotronTabObserver::DidFinishNavigation(
    content::NavigationHandle* handle) {
  if (!handle || !handle->HasCommitted() ||
      !handle->IsInPrimaryMainFrame())
    return;
  Emit("navigation", "same_document",
       handle->IsSameDocument() ? "true" : "false");
}

void AzecotronTabObserver::DidChangeVisibleSecurityState() {
  if (!web_contents())
    return;
  Emit("security", "secure",
       web_contents()->GetLastCommittedURL().SchemeIsCryptographic()
           ? "true"
           : "false");
}

void AzecotronTabObserver::RendererUnresponsive(
    content::RenderWidgetHost*,
    base::RepeatingClosure) {
  Emit("renderer-unresponsive");
}

void AzecotronTabObserver::RendererResponsive() {
  Emit("renderer-responsive");
}

void AzecotronTabObserver::WebContentsDestroyed() {
  Emit("destroyed");
}

}  // namespace synth_azecotron

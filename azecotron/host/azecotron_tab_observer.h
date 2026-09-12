#ifndef SYNTH_AZECOTRON_AZECOTRON_TAB_OBSERVER_H_
#define SYNTH_AZECOTRON_AZECOTRON_TAB_OBSERVER_H_

#include <string>

#include "content/public/browser/navigation_handle.h"
#include "content/public/browser/web_contents_observer.h"

namespace synth_azecotron {

class AzecotronTabObserver final : public content::WebContentsObserver {
 public:
  AzecotronTabObserver(content::WebContents* web_contents,
                       std::string tab_id,
                       std::string role);
  AzecotronTabObserver(const AzecotronTabObserver&) = delete;
  AzecotronTabObserver& operator=(const AzecotronTabObserver&) = delete;
  ~AzecotronTabObserver() override;

  void DidStartLoading() override;
  void DidStopLoading() override;
  void DidFinishNavigation(
      content::NavigationHandle* navigation_handle) override;
  void DidChangeVisibleSecurityState() override;
  void RendererUnresponsive(
      content::RenderWidgetHost* render_widget_host,
      base::RepeatingClosure hang_monitor_restarter) override;
  void RendererResponsive() override;
  void WebContentsDestroyed() override;

 private:
  void Emit(const char* type, const std::string& extra_key = {},
            const std::string& extra_value = {}) const;

  const std::string tab_id_;
  const std::string role_;
};

}  // namespace synth_azecotron

#endif

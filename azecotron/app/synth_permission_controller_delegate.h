#ifndef SYNTH_AZECOTRON_SYNTH_PERMISSION_CONTROLLER_DELEGATE_H_
#define SYNTH_AZECOTRON_SYNTH_PERMISSION_CONTROLLER_DELEGATE_H_

#include <string>
#include <unordered_map>
#include <vector>

#include "content/public/browser/permission_controller_delegate.h"

namespace synth_azecotron {

class SynthPermissionControllerDelegate final
    : public content::PermissionControllerDelegate {
 public:
  explicit SynthPermissionControllerDelegate(const base::FilePath& policy_path);
  SynthPermissionControllerDelegate(const SynthPermissionControllerDelegate&) = delete;
  SynthPermissionControllerDelegate& operator=(const SynthPermissionControllerDelegate&) = delete;
  ~SynthPermissionControllerDelegate() override;

  void RequestPermissionsFromCurrentDocument(
      content::RenderFrameHost* render_frame_host,
      const content::PermissionRequestDescription& request_description,
      base::OnceCallback<void(const std::vector<content::PermissionResult>&)>
          callback) override;

  content::PermissionResult GetPermissionResultForOriginWithoutContext(
      const blink::mojom::PermissionDescriptorPtr& permission_descriptor,
      const url::Origin& requesting_origin,
      const url::Origin& embedding_origin) override;

  content::PermissionResult GetPermissionResultForCurrentDocument(
      const blink::mojom::PermissionDescriptorPtr& permission_descriptor,
      content::RenderFrameHost* render_frame_host,
      bool should_include_device_status) override;

  content::PermissionResult GetPermissionResultForWorker(
      const blink::mojom::PermissionDescriptorPtr& permission_descriptor,
      content::RenderProcessHost* render_process_host,
      const GURL& worker_origin) override;

  content::PermissionResult GetPermissionResultForEmbeddedRequester(
      const blink::mojom::PermissionDescriptorPtr& permission_descriptor,
      content::RenderFrameHost* render_frame_host,
      const url::Origin& requesting_origin) override;

  blink::mojom::PermissionStatus GetPermissionStatus(
      const blink::mojom::PermissionDescriptorPtr& permission_descriptor,
      const GURL& requesting_origin,
      const GURL& embedding_origin) override;

  void ResetPermission(blink::PermissionType permission,
                       const GURL& requesting_origin,
                       const GURL& embedding_origin) override;

 private:
  content::PermissionResult ResultFor(
      const blink::mojom::PermissionDescriptorPtr& permission_descriptor,
      const url::Origin& requesting_origin) const;

  std::string PolicyKey(const blink::mojom::PermissionDescriptorPtr& descriptor) const;
  std::string PolicyFor(const std::string& key) const;
  void LoadPolicy();

  const base::FilePath policy_path_;
  std::unordered_map<std::string, std::string> policy_;
};

}  // namespace synth_azecotron

#endif

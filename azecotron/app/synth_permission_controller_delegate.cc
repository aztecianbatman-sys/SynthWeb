#include "azecotron/app/synth_permission_controller_delegate.h"

#include <utility>

#include "base/files/file_util.h"
#include "base/json/json_reader.h"
#include "base/values.h"
#include "content/public/browser/permission_request_description.h"
#include "content/public/browser/render_frame_host.h"
#include "content/public/browser/render_process_host.h"
#include "content/public/browser/permission_result.h"
#include "third_party/blink/public/mojom/permissions/permission.mojom.h"
#include "url/gurl.h"
#include "url/origin.h"

namespace synth_azecotron {

namespace {

using PermissionName = blink::mojom::PermissionName;
using PermissionStatus = blink::mojom::PermissionStatus;

std::string NameFor(PermissionName name) {
  switch (name) {
    case PermissionName::GEOLOCATION: return "permission_geolocation";
    case PermissionName::NOTIFICATIONS: return "permission_notifications";
    case PermissionName::MIDI: return "permission_midi";
    case PermissionName::AUDIO_CAPTURE: return "permission_microphone";
    case PermissionName::VIDEO_CAPTURE: return "permission_camera";
    case PermissionName::SENSORS: return "permission_sensors";
    case PermissionName::CLIPBOARD_READ: return "permission_clipboard";
    default: return "permission_unknown";
  }
}

content::PermissionResult SettingResult(const std::string& policy) {
  if (policy == "allow")
    return content::PermissionResult(PermissionStatus::GRANTED,
                                     content::PermissionStatusSource::UNSPECIFIED);
  if (policy == "prompt")
    return content::PermissionResult(PermissionStatus::ASK,
                                     content::PermissionStatusSource::UNSPECIFIED);
  return content::PermissionResult(PermissionStatus::DENIED,
                                   content::PermissionStatusSource::UNSPECIFIED);
}

}  // namespace

SynthPermissionControllerDelegate::SynthPermissionControllerDelegate(
    const base::FilePath& policy_path)
    : policy_path_(policy_path) {
  LoadPolicy();
}

SynthPermissionControllerDelegate::~SynthPermissionControllerDelegate() = default;

void SynthPermissionControllerDelegate::LoadPolicy() {
  std::string json;
  if (!base::ReadFileToString(policy_path_, &json))
    return;

  auto value = base::JSONReader::Read(json);
  if (!value || !value->is_dict())
    return;

  for (auto [key, item] : value->GetDict()) {
    if (item.is_string())
      policy_[key] = item.GetString();
  }
}

std::string SynthPermissionControllerDelegate::PolicyKey(
    const blink::mojom::PermissionDescriptorPtr& descriptor) const {
  if (!descriptor)
    return "permission_unknown";
  return NameFor(descriptor->name);
}

std::string SynthPermissionControllerDelegate::PolicyFor(
    const std::string& key) const {
  auto it=policy_.find(key);
  if (it!=policy_.end())
    return it->second;
  return "deny";
}

content::PermissionResult SynthPermissionControllerDelegate::ResultFor(
    const blink::mojom::PermissionDescriptorPtr& descriptor,
    const url::Origin&) const {
  return SettingResult(PolicyFor(PolicyKey(descriptor)));
}

void SynthPermissionControllerDelegate::RequestPermissionsFromCurrentDocument(
    content::RenderFrameHost* render_frame_host,
    const content::PermissionRequestDescription& request_description,
    base::OnceCallback<void(const std::vector<content::PermissionResult>&)> callback) {
  const auto origin =
      request_description.requesting_origin.is_valid()
          ? url::Origin::Create(request_description.requesting_origin)
          : render_frame_host
                ? render_frame_host->GetLastCommittedOrigin()
                : url::Origin();

  std::vector<content::PermissionResult> results;
  results.reserve(request_description.permissions.size());
  for (const auto& descriptor : request_description.permissions)
    results.push_back(ResultFor(descriptor, origin));

  std::move(callback).Run(results);
}

content::PermissionResult
SynthPermissionControllerDelegate::GetPermissionResultForOriginWithoutContext(
    const blink::mojom::PermissionDescriptorPtr& descriptor,
    const url::Origin& requesting_origin,
    const url::Origin&) {
  return ResultFor(descriptor, requesting_origin);
}

content::PermissionResult
SynthPermissionControllerDelegate::GetPermissionResultForCurrentDocument(
    const blink::mojom::PermissionDescriptorPtr& descriptor,
    content::RenderFrameHost* render_frame_host,
    bool) {
  if (!render_frame_host)
    return SettingResult("deny");
  return ResultFor(descriptor, render_frame_host->GetLastCommittedOrigin());
}

content::PermissionResult
SynthPermissionControllerDelegate::GetPermissionResultForWorker(
    const blink::mojom::PermissionDescriptorPtr& descriptor,
    content::RenderProcessHost*,
    const GURL& worker_origin) {
  return ResultFor(descriptor, url::Origin::Create(worker_origin));
}

content::PermissionResult
SynthPermissionControllerDelegate::GetPermissionResultForEmbeddedRequester(
    const blink::mojom::PermissionDescriptorPtr& descriptor,
    content::RenderFrameHost* render_frame_host,
    const url::Origin& requesting_origin) {
  if (!render_frame_host)
    return SettingResult("deny");
  return ResultFor(descriptor, requesting_origin);
}

blink::mojom::PermissionStatus
SynthPermissionControllerDelegate::GetPermissionStatus(
    const blink::mojom::PermissionDescriptorPtr& descriptor,
    const GURL& requesting_origin,
    const GURL&) {
  return ResultFor(descriptor, url::Origin::Create(requesting_origin)).status;
}

void SynthPermissionControllerDelegate::ResetPermission(
    blink::PermissionType,
    const GURL&,
    const GURL&) {
  // Synth persists policy through its profile policy file. Reset is handled by
  // the browser shell command that rewrites that file.
}

}  // namespace synth_azecotron

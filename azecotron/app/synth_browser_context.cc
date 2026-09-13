#include "azecotron/app/synth_browser_context.h"

#include "content/public/browser/download_manager.h"
#include "content/public/browser/browser_thread.h"
#include "base/location.h"

namespace synth_azecotron {

SynthBrowserContext::SynthBrowserContext(
    bool off_the_record,
    const base::FilePath& path)
    : off_the_record_(off_the_record), path_(path), resource_context_(std::make_unique<content::ResourceContext>()), permission_delegate_(std::make_unique<SynthPermissionControllerDelegate>(path.AppendASCII("synth-policy.json"))), download_delegate_(std::make_unique<SynthDownloadManagerDelegate>(path.AppendASCII("Downloads"))) {}

SynthBrowserContext::~SynthBrowserContext() {
  NotifyWillBeDestroyed();
  if (auto* manager = GetDownloadManager()) {
    manager->SetDelegate(nullptr);
    manager->Shutdown();
  }
  ShutdownStoragePartitions();
  auto* resource_context = resource_context_.release();
  if (resource_context) {
    content::BrowserThread::DeleteSoon(content::BrowserThread::IO,
                                       FROM_HERE, resource_context);
  }
}

std::unique_ptr<content::ZoomLevelDelegate>
SynthBrowserContext::CreateZoomLevelDelegate(
    const base::FilePath&) {
  return nullptr;
}

base::FilePath SynthBrowserContext::GetPath() const {
  return path_;
}

bool SynthBrowserContext::IsOffTheRecord() {
  return off_the_record_;
}

content::ResourceContext* SynthBrowserContext::GetResourceContext() {
  return resource_context_.get();
}

content::DownloadManagerDelegate*
SynthBrowserContext::GetDownloadManagerDelegate() {
  return download_delegate_.get();
}

content::BrowserPluginGuestManager*
SynthBrowserContext::GetGuestManager() {
  return nullptr;
}

storage::SpecialStoragePolicy*
SynthBrowserContext::GetSpecialStoragePolicy() {
  return nullptr;
}

content::PlatformNotificationService*
SynthBrowserContext::GetPlatformNotificationService() {
  return nullptr;
}

content::PushMessagingService*
SynthBrowserContext::GetPushMessagingService() {
  return nullptr;
}

content::StorageNotificationService*
SynthBrowserContext::GetStorageNotificationService() {
  return nullptr;
}

content::SSLHostStateDelegate*
SynthBrowserContext::GetSSLHostStateDelegate() {
  return nullptr;
}

content::PermissionControllerDelegate*
SynthBrowserContext::GetPermissionControllerDelegate() {
  return permission_delegate_.get();
}

content::ReduceAcceptLanguageControllerDelegate*
SynthBrowserContext::GetReduceAcceptLanguageControllerDelegate() {
  return nullptr;
}

content::ClientHintsControllerDelegate*
SynthBrowserContext::GetClientHintsControllerDelegate() {
  return nullptr;
}

content::BackgroundFetchDelegate*
SynthBrowserContext::GetBackgroundFetchDelegate() {
  return nullptr;
}

content::BackgroundSyncController*
SynthBrowserContext::GetBackgroundSyncController() {
  return nullptr;
}

content::BrowsingDataRemoverDelegate*
SynthBrowserContext::GetBrowsingDataRemoverDelegate() {
  return nullptr;
}

}  // namespace synth_azecotron

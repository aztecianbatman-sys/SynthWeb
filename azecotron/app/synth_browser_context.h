#ifndef SYNTH_AZECOTRON_SYNTH_BROWSER_CONTEXT_H_
#define SYNTH_AZECOTRON_SYNTH_BROWSER_CONTEXT_H_

#include <memory>

#include "base/files/file_path.h"
#include "content/public/browser/browser_context.h"
#include <memory>
#include "azecotron/app/synth_download_manager_delegate.h"
#include "azecotron/app/synth_permission_controller_delegate.h"

namespace synth_azecotron {

class SynthDownloadManagerDelegate;
class SynthPermissionControllerDelegate;

class SynthDownloadManagerDelegate;
class SynthPermissionControllerDelegate;

class SynthBrowserContext final : public content::BrowserContext {
 public:
  SynthBrowserContext(bool off_the_record, const base::FilePath& path);
  SynthBrowserContext(const SynthBrowserContext&) = delete;
  SynthBrowserContext& operator=(const SynthBrowserContext&) = delete;
  ~SynthBrowserContext() override;

  std::unique_ptr<content::ZoomLevelDelegate> CreateZoomLevelDelegate(
      const base::FilePath& partition_path) override;
  base::FilePath GetPath() const override;
  bool IsOffTheRecord() override;
  content::DownloadManagerDelegate* GetDownloadManagerDelegate() override;
  content::BrowserPluginGuestManager* GetGuestManager() override;
  storage::SpecialStoragePolicy* GetSpecialStoragePolicy() override;
  content::PlatformNotificationService* GetPlatformNotificationService() override;
  content::PushMessagingService* GetPushMessagingService() override;
  content::StorageNotificationService* GetStorageNotificationService() override;
  content::SSLHostStateDelegate* GetSSLHostStateDelegate() override;
  content::PermissionControllerDelegate* GetPermissionControllerDelegate() override;
  content::ReduceAcceptLanguageControllerDelegate*
  GetReduceAcceptLanguageControllerDelegate() override;
  content::ClientHintsControllerDelegate* GetClientHintsControllerDelegate()
      override;
  content::BackgroundFetchDelegate* GetBackgroundFetchDelegate() override;
  content::BackgroundSyncController* GetBackgroundSyncController() override;
  content::BrowsingDataRemoverDelegate*
  GetBrowsingDataRemoverDelegate() override;

 private:
  const bool off_the_record_;
  const base::FilePath path_;
  std::unique_ptr<SynthDownloadManagerDelegate> download_delegate_;
  std::unique_ptr<SynthPermissionControllerDelegate> permission_delegate_;
  std::unique_ptr<SynthPermissionControllerDelegate> permission_delegate_;
  std::unique_ptr<SynthDownloadManagerDelegate> download_delegate_;
  const base::FilePath path_;
};

}  // namespace synth_azecotron

#endif  // SYNTH_AZECOTRON_SYNTH_BROWSER_CONTEXT_H_

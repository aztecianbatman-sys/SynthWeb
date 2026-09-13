#ifndef SYNTH_AZECOTRON_SYNTH_DOWNLOAD_MANAGER_DELEGATE_H_
#define SYNTH_AZECOTRON_SYNTH_DOWNLOAD_MANAGER_DELEGATE_H_

#include "content/public/browser/download_manager_delegate.h"

namespace synth_azecotron {

class SynthDownloadManagerDelegate final
    : public content::DownloadManagerDelegate {
 public:
  explicit SynthDownloadManagerDelegate(const base::FilePath& download_root);
  SynthDownloadManagerDelegate(const SynthDownloadManagerDelegate&) = delete;
  SynthDownloadManagerDelegate& operator=(const SynthDownloadManagerDelegate&) = delete;
  ~SynthDownloadManagerDelegate() override;

  void Shutdown() override;
  void GetNextId(content::DownloadIdCallback callback) override;
  bool DetermineDownloadTarget(
      download::DownloadItem* item,
      content::DownloadTargetCallback* callback) override;
  bool ShouldOpenDownload(
      download::DownloadItem* item,
      content::DownloadOpenDelayedCallback callback) override;

 private:
  base::FilePath SanitizeFilename(const base::FilePath& suggested) const;

  const base::FilePath download_root_;
  uint32_t next_id_ = download::DownloadItem::kInvalidId + 1;
  bool shutting_down_ = false;
};

}  // namespace synth_azecotron

#endif

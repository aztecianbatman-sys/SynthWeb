#include "azecotron/app/synth_download_manager_delegate.h"

#include "base/files/file_util.h"
#include "base/strings/string_util.h"
#include "components/download/public/common/download_item.h"
#include "components/download/public/common/download_target_info.h"

namespace synth_azecotron {

SynthDownloadManagerDelegate::SynthDownloadManagerDelegate(
    const base::FilePath& download_root)
    : download_root_(download_root) {
  base::CreateDirectory(download_root_);
}

SynthDownloadManagerDelegate::~SynthDownloadManagerDelegate() = default;

void SynthDownloadManagerDelegate::Shutdown() {
  shutting_down_ = true;
}

void SynthDownloadManagerDelegate::GetNextId(
    content::DownloadIdCallback callback) {
  if (shutting_down_) {
    std::move(callback).Run(download::DownloadItem::kInvalidId);
    return;
  }
  std::move(callback).Run(next_id_++);
}

base::FilePath SynthDownloadManagerDelegate::SanitizeFilename(
    const base::FilePath& suggested) const {
  base::FilePath name=suggested.BaseName();
#if BUILDFLAG(IS_WIN)
  constexpr auto kSeparators = FILE_PATH_LITERAL("<>:\"/\\\\|?*");
#else
  constexpr auto kSeparators = FILE_PATH_LITERAL("/");
#endif
  std::u16string value=name.value();
  for (char16_t& ch:value) {
    if (std::u16string_view(kSeparators).find(ch)!=std::u16string_view::npos ||
        ch<0x20) {
      ch=u'_';
    }
  }
  while (!value.empty() && (value.back()==u'.' || value.back()==u' '))
    value.pop_back();
  if(value.empty()) value=u"download";
  if(value==u"." || value==u"..") value=u"download";
  return base::FilePath(value);
}

bool SynthDownloadManagerDelegate::DetermineDownloadTarget(
    download::DownloadItem* item,
    content::DownloadTargetCallback* callback) {
  if(shutting_down_ || !item || !callback)
    return false;

  base::FilePath suggested=SanitizeFilename(
      item->GetTargetFilePath().empty()
          ? base::FilePath(FILE_PATH_LITERAL("download"))
          : item->GetTargetFilePath());

  base::FilePath target=download_root_.Append(suggested);
  base::FilePath intermediate=target.AddExtension(FILE_PATH_LITERAL("crdownload"));

  download::DownloadTargetInfo info;
  info.target_path=target;
  info.intermediate_path=intermediate;
  info.target_disposition=download::DownloadItem::TARGET_DISPOSITION_OVERWRITE;
  info.danger_type=download::DOWNLOAD_DANGER_TYPE_NOT_DANGEROUS;
  info.is_filetype_handled_safely=false;

  std::move(*callback).Run(std::move(info));
  return true;
}

bool SynthDownloadManagerDelegate::ShouldOpenDownload(
    download::DownloadItem*,
    content::DownloadOpenDelayedCallback callback) {
  std::move(callback).Run(false);
  return true;
}

}  // namespace synth_azecotron

#ifndef SYNTH_AZECOTRON_SYNTH_BROWSER_CONTEXT_H_
#define SYNTH_AZECOTRON_SYNTH_BROWSER_CONTEXT_H_

#include "base/files/file_path.h"
#include "content/shell/browser/shell_browser_context.h"

namespace synth_azecotron {

class SynthBrowserContext final : public content::ShellBrowserContext {
 public:
  SynthBrowserContext(bool off_the_record, const base::FilePath& path);
  SynthBrowserContext(const SynthBrowserContext&) = delete;
  SynthBrowserContext& operator=(const SynthBrowserContext&) = delete;
  ~SynthBrowserContext() override;

  base::FilePath GetPath() override;

 private:
  base::FilePath path_;
};

}  // namespace synth_azecotron

#endif

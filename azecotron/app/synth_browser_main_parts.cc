#include "azecotron/app/synth_browser_main_parts.h"

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/path_service.h"
#include "azecotron/app/synth_browser_context.h"
#include "content/public/common/content_switches.h"

namespace synth_azecotron {

SynthBrowserMainParts::SynthBrowserMainParts() = default;

SynthBrowserMainParts::~SynthBrowserMainParts() = default;

void SynthBrowserMainParts::InitializeBrowserContexts() {
  base::FilePath path;
  if (!base::PathService::Get(base::DIR_USER_DATA, &path)) {
    path = base::CommandLine::ForCurrentProcess()->GetSwitchValuePath(
        "user-data-dir");
  }
  if (path.empty()) {
    path = base::FilePath(FILE_PATH_LITERAL("SynthBrowserProfile"));
  }

  auto* context = new SynthBrowserContext(
      false,
      path.AppendASCII("AzecotronProfile"));
  synth_browser_context_ = context;
  set_browser_context(context);

  auto* private_context = new SynthBrowserContext(
      true,
      path.AppendASCII("AzecotronPrivate"));
  set_off_the_record_browser_context(private_context);
}

void SynthBrowserMainParts::InitializeMessageLoopContext() {
  // The Tauri host supplies the window. Do not create a Content Shell window.
}

}  // namespace synth_azecotron

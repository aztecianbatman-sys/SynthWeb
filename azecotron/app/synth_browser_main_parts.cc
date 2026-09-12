#include "azecotron/app/synth_browser_main_parts.h"

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/path_service.h"
#include "azecotron/app/synth_browser_context.h"
#include "content/public/common/content_switches.h"
#include "content/public/common/result_codes.h"

namespace synth_azecotron {

SynthBrowserMainParts::SynthBrowserMainParts(
    const content::MainFunctionParams& parameters)
    : parameters_(parameters) {}

SynthBrowserMainParts::~SynthBrowserMainParts() = default;

void SynthBrowserMainParts::InitializeBrowserContexts() {
  base::FilePath root =
      base::CommandLine::ForCurrentProcess()->GetSwitchValuePath(
          "user-data-dir");

  if (root.empty() && !base::PathService::Get(base::DIR_USER_DATA, &root)) {
    root = base::FilePath(FILE_PATH_LITERAL("SynthBrowserProfile"));
  }

  browser_context_ = std::make_unique<SynthBrowserContext>(
      false, root.AppendASCII("AzecotronProfile"));
  off_the_record_browser_context_ = std::make_unique<SynthBrowserContext>(
      true, root.AppendASCII("AzecotronPrivate"));
}

int SynthBrowserMainParts::PreMainMessageLoopRun() {
  InitializeBrowserContexts();
  return content::RESULT_CODE_NORMAL_EXIT;
}

void SynthBrowserMainParts::PostMainMessageLoopRun() {
  browser_context_.reset();
  off_the_record_browser_context_.reset();
}

}  // namespace synth_azecotron

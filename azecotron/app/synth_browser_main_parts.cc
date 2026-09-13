#include "azecotron/app/synth_browser_main_parts.h"

#include "base/command_line.h"
#include "base/files/file_path.h"
#include "base/path_service.h"
#include "azecotron/app/synth_browser_context.h"
#include "azecotron/host/azecotron_runtime_host.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/navigation_controller.h"
#include "url/gurl.h"
#include "content/public/common/content_switches.h"
#include <string>
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

void SynthBrowserMainParts::PreMainMessageLoopRun() {
  InitializeBrowserContexts();

  const auto& command_line = *base::CommandLine::ForCurrentProcess();
  std::string url = command_line.GetSwitchValueASCII("synth-url");
  if (url.empty())
    url = "about:blank";

  GURL target(url);
  if (!target.is_valid())
    return;

  runtime_host_ =
      std::make_unique<AzecotronRuntimeHost>(browser_context_.get());

  content::WebContents::CreateParams params(browser_context_.get());
  auto web_contents = content::WebContents::Create(params);
  if (!web_contents)
    return;

  if (!runtime_host_->AdoptWebContents(std::move(web_contents), target))
    return;

  return content::RESULT_CODE_NORMAL_EXIT;
}

void SynthBrowserMainParts::PostMainMessageLoopRun() {
  runtime_host_.reset();
  off_the_record_browser_context_.reset();
  browser_context_.reset();
}

}  // namespace synth_azecotron

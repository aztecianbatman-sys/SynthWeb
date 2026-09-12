#include "build/build_config.h"
#include "content/public/app/content_main.h"
#if BUILDFLAG(IS_WIN)
#include "content/public/app/sandbox_helper_win.h"
#include "sandbox/win/src/sandbox_types.h"  // nogncheck
#endif
#include "content/public/browser/web_contents.h"
#include "azecotron/app/synth_content_main_delegate.h"
#include "azecotron/app/synth_content_browser_client.h"
#include "base/command_line.h"
#include "content/public/browser/navigation_controller.h"
#include "base/command_line.h"
#include "base/functional/bind.h"
#include "ui/base/page_transition_types.h"
#include "url/gurl.h"
#include "azecotron/host/azecotron_runtime_host.h"

#if BUILDFLAG(IS_WIN)
#include <windows.h>
#include <cstdint>
#include <cstdlib>
#endif

namespace {

std::unique_ptr<synth_azecotron::AzecotronRuntimeHost> g_runtime_host;

void AttachExistingContentShellToSynth() {
  const base::CommandLine* command_line =
      base::CommandLine::ForCurrentProcess();

  auto* client = synth_azecotron::SynthContentBrowserClient::Get();
  if (!client || !client->GetBrowserContext())
    return;

  content::WebContents::CreateParams params(client->GetBrowserContext());
  std::unique_ptr<content::WebContents> web_contents =
      content::WebContents::Create(params);
  if (!web_contents)
    return;

  g_runtime_host = std::make_unique<synth_azecotron::AzecotronRuntimeHost>(
      client->GetBrowserContext());

  std::string startup_url =
      command_line->GetSwitchValueASCII("synth-url");
  if (startup_url.empty()) {
    startup_url = "about:blank";
  }

  GURL url(startup_url);
  g_runtime_host->AdoptWebContents(std::move(web_contents), url);

#if BUILDFLAG(IS_WIN)
  const std::string parent_value =
      command_line->GetSwitchValueASCII("synth-parent-hwnd");
  if (!parent_value.empty()) {
    const auto raw =
        static_cast<uintptr_t>(std::strtoull(parent_value.c_str(), nullptr, 10));
    HWND parent = reinterpret_cast<HWND>(raw);
    HWND child = static_cast<HWND>(g_runtime_host->GetNativeViewForEmbedding());

    if (parent && child) {
      SetParent(child, parent);

      RECT rect{};
      GetClientRect(parent, &rect);
      const int width = rect.right - rect.left;
      const int height = rect.bottom - rect.top;

      SetWindowPos(child, HWND_TOP, 0, 0, width, height,
                   SWP_NOACTIVATE | SWP_SHOWWINDOW);


    }
  }
#endif
}

}  // namespace

int main(int argc, const char** argv) {
  synth_azecotron::SynthContentMainDelegate delegate;
  content::ContentMainParams params(&delegate);

#if BUILDFLAG(IS_WIN)
  sandbox::SandboxInterfaceInfo sandbox_info = {};
  content::InitializeSandboxInfo(&sandbox_info);
  params.instance = GetModuleHandle(nullptr);
  params.sandbox_info = &sandbox_info;
#else
  #if !BUILDFLAG(IS_ANDROID) && !BUILDFLAG(IS_IOS)
    params.argc = argc;
    params.argv = argv;
  #endif
#endif

  params.ui_task = base::BindOnce([] {
    AttachExistingContentShellToSynth();
  });

  return content::ContentMain(std::move(params));
}

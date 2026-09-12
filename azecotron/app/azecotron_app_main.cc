#include "content/public/app/content_main.h"
#include "content/shell/app/shell_main_delegate.h"
#include "content/shell/browser/shell.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/navigation_controller.h"
#include "base/command_line.h"
#include "url/gurl.h"

#if BUILDFLAG(IS_WIN)
#include <windows.h>
#include <cstdint>
#include <cstdlib>
#endif

namespace {

void AttachExistingContentShellToSynth() {
  const base::CommandLine* command_line =
      base::CommandLine::ForCurrentProcess();

  if (content::Shell::windows().empty())
    return;

  content::Shell* shell = content::Shell::windows().back();
  content::WebContents* web_contents = shell->web_contents();
  if (!web_contents)
    return;

  std::string startup_url =
      command_line->GetSwitchValueASCII("synth-url");
  if (startup_url.empty()) {
    startup_url = "about:blank";
  }

  GURL url(startup_url);
  if (url.is_valid()) {
    web_contents->GetController().LoadURL(
        url, content::Referrer(), ui::PAGE_TRANSITION_TYPED,
        std::string());
  }

#if BUILDFLAG(IS_WIN)
  const std::string parent_value =
      command_line->GetSwitchValueASCII("synth-parent-hwnd");
  if (!parent_value.empty()) {
    const auto raw =
        static_cast<uintptr_t>(std::strtoull(parent_value.c_str(), nullptr, 10));
    HWND parent = reinterpret_cast<HWND>(raw);
    HWND child = web_contents->GetNativeView();

    if (parent && child) {
      SetParent(child, parent);

      RECT rect{};
      GetClientRect(parent, &rect);
      const int width = rect.right - rect.left;
      const int height = rect.bottom - rect.top;

      SetWindowPos(child, HWND_TOP, 0, 0, width, height,
                   SWP_NOACTIVATE | SWP_SHOWWINDOW);

      if (shell->window()) {
        ShowWindow(shell->window(), SW_HIDE);
      }
    }
  }
#endif
}

}  // namespace

int main(int argc, const char** argv) {
  content::ShellMainDelegate delegate;
  content::ContentMainParams params(&delegate);

#if !BUILDFLAG(IS_ANDROID) && !BUILDFLAG(IS_IOS)
  params.argc = argc;
  params.argv = argv;
#endif

  params.ui_task = base::BindOnce([] {
    AttachExistingContentShellToSynth();
  });

  return content::ContentMain(std::move(params));
}

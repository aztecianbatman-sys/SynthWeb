#include "azecotron/app/synth_tracker_throttle.h"

#include <atomic>
#include <array>
#include <string_view>

#include "net/base/net_errors.h"
#include "services/network/public/cpp/resource_request.h"
#include "url/gurl.h"

namespace synth_azecotron {
namespace {

std::atomic<uint64_t> g_blocked{0};
std::atomic<uint64_t> g_seen{0};

constexpr std::array<std::string_view, 12> kTrackerPatterns = {{
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "connect.facebook.net",
    "facebook.net",
    "scorecardresearch.com",
    "hotjar.com",
    "segment.io",
    "mixpanel.com",
    "amplitude.com",
    "matomo.cloud",
    "clarity.ms",
}};

bool IsTrackerHost(const GURL& url) {
  if (!url.is_valid() || !url.SchemeIsHTTPOrHTTPS())
    return false;

  const std::string host=url.host();
  for (const auto pattern:kTrackerPatterns) {
    if (host==pattern || host.size()>pattern.size() &&
        host.ends_with(std::string(".")+std::string(pattern))) {
      return true;
    }
  }
  return false;
}

}  // namespace

void SynthTrackerThrottle::WillStartRequest(
    network::ResourceRequest* request,
    bool* defer) {
  *defer=false;
  if (!request)
    return;

  ++g_seen;

  // Browser/omnibox navigations do not have a renderer request initiator.
  // Never block a user navigating directly to a host merely because that host
  // also appears in the tracker rule set.
  if (!request->request_initiator.has_value())
    return;

  if (IsTrackerHost(request->url)) {
    ++g_blocked;
    delegate_->CancelWithError(
        net::ERR_BLOCKED_BY_CLIENT,
        "Synth Shield blocked a tracker resource.");
  }
}

uint64_t SynthTrackerThrottle::blocked_count() {
  return g_blocked.load();
}

uint64_t SynthTrackerThrottle::seen_count() {
  return g_seen.load();
}

void SynthTrackerThrottle::reset_counters() {
  g_blocked.store(0);
  g_seen.store(0);
}

std::unique_ptr<blink::URLLoaderThrottle> CreateSynthTrackerThrottle() {
  return std::make_unique<SynthTrackerThrottle>();
}

}  // namespace synth_azecotron

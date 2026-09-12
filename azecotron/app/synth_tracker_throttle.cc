#include "azecotron/app/synth_tracker_throttle.h"

#include <atomic>
#include <array>
#include <string_view>
#include <iostream>

#include "base/json/json_writer.h"
#include "base/values.h"

#include "net/base/net_errors.h"
#include "services/network/public/cpp/resource_request.h"
#include "url/gurl.h"

namespace synth_azecotron {
namespace {

std::atomic<uint64_t> g_blocked{0};
std::atomic<uint64_t> g_seen{0};
std::atomic<uint64_t> g_cookie_stripped{0};

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
    base::Value::Dict event;
    event.Set("type","tracker-blocked");
    event.Set("url",request->url.spec());
    event.Set("blocked",static_cast<int>(g_blocked.load()));
    std::string json;
    base::JSONWriter::Write(event,&json);
    std::cout << "SYNTH_EVENT " << json << std::endl;
    delegate_->CancelWithError(
        net::ERR_BLOCKED_BY_CLIENT,
        "Synth Shield blocked a tracker resource.");
  }

  // Strict mode: do not send cookies from a web origin to a different origin.
  // This intentionally favors privacy over cross-origin convenience.
  if (request->request_initiator.has_value() &&
      request->url.is_valid() &&
      request->url.SchemeIsHTTPOrHTTPS()) {
    const url::Origin target = url::Origin::Create(request->url);
    if (!target.IsSameOriginWith(request->request_initiator.value())) {
      if (request->headers.HasHeader("Cookie")) {
        request->headers.RemoveHeader("Cookie");
        ++g_cookie_stripped;
      }
    }
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

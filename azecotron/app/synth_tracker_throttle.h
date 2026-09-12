#ifndef SYNTH_AZECOTRON_SYNTH_TRACKER_THROTTLE_H_
#define SYNTH_AZECOTRON_SYNTH_TRACKER_THROTTLE_H_

#include <memory>

#include "third_party/blink/public/common/loader/url_loader_throttle.h"

namespace network { struct ResourceRequest; }

namespace synth_azecotron {

class SynthTrackerThrottle final : public blink::URLLoaderThrottle {
 public:
  SynthTrackerThrottle() = default;
  SynthTrackerThrottle(const SynthTrackerThrottle&) = delete;
  SynthTrackerThrottle& operator=(const SynthTrackerThrottle&) = delete;
  ~SynthTrackerThrottle() override = default;

  void WillStartRequest(network::ResourceRequest* request, bool* defer) override;

  static uint64_t blocked_count();
  static uint64_t seen_count();
  static void reset_counters();
};

std::unique_ptr<blink::URLLoaderThrottle> CreateSynthTrackerThrottle();

}  // namespace synth_azecotron

#endif

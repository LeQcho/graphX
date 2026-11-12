#pragma once
#include "vendor/DeckLinkAPI.h"

namespace graphx {
struct OutputFormat {
    BMDPixelFormat pixel = bmdFormatUnspecified;
    explicit operator bool() const { return pixel != bmdFormatUnspecified; }
    const char* name() const {
        return pixel == bmdFormat10BitYUVA ? "YUVA 10 bits" : pixel == bmdFormat8BitARGB ? "ARGB 8 bits" : "BGRA 8 bits";
    }
};
// Both enumeration and start must use this same negotiation. Never probe SDI
// on an integrated Thunderbolt product. Reject implicit cadence conversions.
template<class Probe>
OutputFormat chooseOutputFormat(bool internal, Probe probe) {
    const BMDPixelFormat rgb[] = {bmdFormat8BitBGRA, bmdFormat8BitARGB, bmdFormat10BitYUVA};
    const BMDPixelFormat integrated[] = {bmdFormat10BitYUVA, bmdFormat8BitBGRA, bmdFormat8BitARGB};
    for (auto pixel : internal ? integrated : rgb) if (probe(pixel)) return {pixel};
    return {};
}
template<class Driver>
OutputFormat outputFormat(Driver* output, BMDDisplayMode mode, bool internal) {
    return chooseOutputFormat(internal, [&](BMDPixelFormat pixel) {
        bool supported = false;
        BMDDisplayMode actual = bmdModeUnknown;
        return output->DoesSupportVideoMode(internal ? bmdVideoConnectionInternal : bmdVideoConnectionUnspecified,
            mode, pixel, bmdNoVideoOutputConversion, bmdSupportedVideoModeKeying, &actual, &supported) == S_OK
            && supported && actual == mode;
    });
}
}

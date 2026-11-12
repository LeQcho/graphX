#include "../engine/output-format.h"
#include "../engine/pixels.h"
#include <array>
#include <cassert>
#include <iostream>
#include <vector>

struct Driver {
    BMDVideoConnection expected;
    BMDPixelFormat accepted;
    HRESULT result = S_OK;
    bool reportsSupport = true, changesMode = false;
    HRESULT DoesSupportVideoMode(BMDVideoConnection connection, BMDDisplayMode mode,
        BMDPixelFormat pixel, BMDVideoOutputConversionMode conversion,
        BMDSupportedVideoModeFlags flags, BMDDisplayMode* actual, bool* supported) {
        assert(connection == expected);
        assert(conversion == bmdNoVideoOutputConversion);
        assert(flags == bmdSupportedVideoModeKeying);
        *actual = changesMode ? bmdModeHD1080p25 : mode;
        *supported = reportsSupport && pixel == accepted;
        return result;
    }
};
int main() {
    // ATEM: only the internal YUVA path is available; SDI/BGRA must not be assumed.
    Driver atem{bmdVideoConnectionInternal, bmdFormat10BitYUVA};
    assert(graphx::outputFormat(&atem, bmdModeHD1080p50, true).pixel == bmdFormat10BitYUVA);
    Driver ultra{bmdVideoConnectionUnspecified, bmdFormat8BitBGRA};
    assert(graphx::outputFormat(&ultra, bmdModeHD1080p50, false).pixel == bmdFormat8BitBGRA);
    ultra.accepted = bmdFormat8BitARGB;
    assert(graphx::outputFormat(&ultra, bmdModeHD1080p50, false).pixel == bmdFormat8BitARGB);
    ultra.accepted = bmdFormat8BitYUV; // No alpha: must refuse output.
    assert(!graphx::outputFormat(&ultra, bmdModeHD1080p50, false));
    atem.result = E_FAIL;
    assert(!graphx::outputFormat(&atem, bmdModeHD1080p50, true));
    atem.result = S_OK; atem.reportsSupport = false;
    assert(!graphx::outputFormat(&atem, bmdModeHD1080p50, true));
    atem.reportsSupport = true; atem.changesMode = true;
    assert(!graphx::outputFormat(&atem, bmdModeHD1080p50, true));

    // Byte vectors from the SDK Ay10 layout: full-range A, legal-range Rec.709.
    const uint8_t input[] = {0,0,0,0, 0,0,0,255, 255,255,255,128, 255,255,255,255};
    std::array<uint8_t,512> bytes; bytes.fill(0xcc);
    graphx::bgraToYUVA(input, bytes.data(), 2, 2, 256);
    const uint8_t black[] = {0x00,0x08,0x00,0x40, 0x3f,0xf8,0x00,0x40};
    const uint8_t white[] = {0x20,0x28,0x03,0xac, 0x3f,0xf8,0x03,0xac};
    assert(std::memcmp(bytes.data(), black, 8) == 0);
    assert(std::memcmp(bytes.data()+256, white, 8) == 0);
    for (int row=0;row<2;++row) for(int i=8;i<256;++i) assert(bytes[row*256+i]==0);
    const uint8_t red[] = {0,0,255,255, 0,0,255,255};
    const uint8_t redExpected[] = {0x3f,0xf6,0x64,0xfa, 0x3f,0xff,0x00,0xfa};
    graphx::bgraToYUVA(red, bytes.data(), 2, 1, 256);
    assert(std::memcmp(bytes.data(), redExpected, 8) == 0);
    std::vector<uint8_t> ramp(256*4), converted(256*4);
    for (int i=0;i<256;++i) ramp[i*4+3]=i;
    graphx::bgraToYUVA(ramp.data(),converted.data(),256,1,1024);
    for (int i=0;i<256;++i) {
        const unsigned alpha=(unsigned(converted[i*4]&0x3f)<<4)|(converted[i*4+1]>>4);
        assert(alpha==unsigned(i*1023+127)/255);
    }
    std::cout << "ATEM/UltraStudio negotiation, Ay10 colors, alpha ramp and row alignment: OK\n";
}

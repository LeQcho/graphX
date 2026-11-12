#pragma once
#include <algorithm>
#include <cstdint>
#include <cstring>

namespace graphx {
// SDK Ay10: big-endian A(10), Cb/Cr(10), Y(10), with two unused high bits.
// Rec.709 video range for YCbCr, full range alpha. Input is already in the
// requested premultiplied/straight convention; conversion never changes alpha.
inline void packYUVA(uint8_t* dst, unsigned y, unsigned chroma, unsigned alpha) {
    const uint32_t word = (alpha << 20) | (chroma << 10) | y;
    dst[0] = word >> 24; dst[1] = word >> 16;
    dst[2] = word >> 8; dst[3] = word;
}
inline void bgraToYUVA(const uint8_t* src, uint8_t* dst, int width, int height, int rowBytes) {
    const auto rounded = [](double n, int lo, int hi) { return unsigned(std::clamp(int(n + 0.5), lo, hi)); };
    for (int row = 0; row < height; ++row) {
        auto* line = dst + row * rowBytes;
        for (int x = 0; x < width; x += 2) {
            const auto* p = src + (size_t(row) * width + x) * 4;
            const double b = (double(p[0]) + p[4]) / 510.0;
            const double g = (double(p[1]) + p[5]) / 510.0;
            const double r = (double(p[2]) + p[6]) / 510.0;
            const auto cb = rounded(512 + 896 * (-0.114572 * r - 0.385428 * g + 0.5 * b), 64, 960);
            const auto cr = rounded(512 + 896 * (0.5 * r - 0.454153 * g - 0.045847 * b), 64, 960);
            for (int i = 0; i < 2; ++i) {
                const auto* pixel = p + i * 4;
                const auto y = rounded(64 + (876.0 / 255) * (0.2126 * pixel[2] + 0.7152 * pixel[1] + 0.0722 * pixel[0]), 64, 940);
                packYUVA(line + (x + i) * 4, y, i ? cr : cb, (unsigned(pixel[3]) * 1023 + 127) / 255);
            }
        }
        std::memset(line + width * 4, 0, rowBytes - width * 4);
    }
}
}

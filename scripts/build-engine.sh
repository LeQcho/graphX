#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p build
clang++ -std=c++17 -O3 -DNDEBUG -mmacosx-version-min=12.0 engine/main.cpp engine/vendor/DeckLinkAPIDispatch.cpp -framework CoreFoundation -pthread -o build/graphx-output
codesign --force --sign - build/graphx-output

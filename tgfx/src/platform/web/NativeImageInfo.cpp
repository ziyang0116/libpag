/////////////////////////////////////////////////////////////////////////////////////////////////
//
//  Tencent is pleased to support the open source community by making libpag available.
//
//  Copyright (C) 2021 THL A29 Limited, a Tencent company. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
//  except in compliance with the License. You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  unless required by applicable law or agreed to in writing, software distributed under the
//  license is distributed on an "as is" basis, without warranties or conditions of any kind,
//  either express or implied. see the license for the specific language governing permissions
//  and limitations under the license.
//
/////////////////////////////////////////////////////////////////////////////////////////////////

#include "NativeImageInfo.h"

using namespace emscripten;

namespace tgfx {
static bool IsPng(ByteBuffer buffer, int& width, int& height) {
  if (buffer.length() < 4) {
    return false;
  }
  if (buffer.readString(4) != "\x89PNG") {
    buffer.setPosition(0);
    return false;
  }
  buffer.skip(8);
  std::string firstChunkType = buffer.readString(4);
  if (firstChunkType == "IHDR" && buffer.length() >= 24) {
    buffer.setOrder(ByteOrder::BigEndian);
    width = buffer.readUint32();
    height = buffer.readUint32();
    return true;
  } else if (firstChunkType == "CgBI") {
    if (buffer.length() >= 40) {
      buffer.skip(12);
      if (buffer.readString(4) == "IHDR") {
        buffer.setOrder(ByteOrder::BigEndian);
        width = buffer.readUint32();
        height = buffer.readUint32();
        return true;
      }
    }
  }
  return false;
}
//
static bool IsJpeg(ByteBuffer buffer, int& width, int& height) {
  if (buffer.length() < 2) {
    return false;
  }
  if (buffer.readString(2) != "\xFF\xD8") {
    return false;
  }
  buffer.setOrder(ByteOrder::BigEndian);
  while (buffer.position() + 9 <= buffer.length()) {
    if (buffer.cmpAnyOf(2, {"\xFF\xC0", "\xFF\xC1", "\xFF\xC2"})) {
      buffer.skip(5);
      height = buffer.readUint16();
      width = buffer.readUint16();
      return true;
    }
    buffer.skip(2);
    uint16_t sectionSize = buffer.readUint16();
    buffer.skip(sectionSize - 2);
  }
  return false;
}

static bool IsWebp(ByteBuffer buffer, int& width, int& height) {
  if (buffer.length() < 16) {
    return false;
  }
  auto RIFF = buffer.readString(4);
  buffer.skip((4));
  auto WEBP = buffer.readString(4);
  if (RIFF != "RIFF" || WEBP != "WEBP") {
    return false;
  }
  std::string type = buffer.readString(4);
  if (type == "VP8 " && buffer.length() >= 30) {
    buffer.skip(10);
    width = buffer.readUint16() & 0x3FFF;
    height = buffer.readUint16() & 0x3FFF;
    return true;
  } else if (type == "VP8L" && buffer.length() >= 25) {
    buffer.skip(5);
    uint32_t n = buffer.readUint32();
    width = (n & 0x3FFF) + 1;
    height = ((n >> 14) & 0x3FFF) + 1;
    return true;
  } else if (type == "VP8X" && buffer.length() >= 30) {
    buffer.skip(4);
    uint8_t extendedHeader = buffer.readUint8();
    bool validStart = (extendedHeader & 0xc0) == 0;
    bool validEnd = (extendedHeader & 0x01) == 0;
    if (validStart && validEnd) {
      buffer.skip(3);
      width = buffer.readUint24() + 1;
      height = buffer.readUint24() + 1;
      return true;
    }
  }
  return false;
}

std::optional<NativeImageInfo> GetNativeImageInfo(std::shared_ptr<Data> imageBytes) {
  NativeImageInfo imageInfo = {};
  ByteBuffer buffer(imageBytes->bytes(), imageBytes->size());
  if (IsPng(buffer, imageInfo.width, imageInfo.height)) {
    return imageInfo;
  } else if (IsJpeg(buffer, imageInfo.width, imageInfo.height)) {
    return imageInfo;
  } else if (IsWebp(buffer, imageInfo.width, imageInfo.height)) {
    static auto nativeImageClass = val::module_property("NativeImage");
    if (!nativeImageClass.as<bool>()) {
      return std::nullopt;
    }
    static auto isSupportWebp = nativeImageClass.call<bool>("isSupportWebp");
    if (!isSupportWebp) {
      return std::nullopt;
    }
    return imageInfo;
  }
  return std::nullopt;
}

}  // namespace tgfx

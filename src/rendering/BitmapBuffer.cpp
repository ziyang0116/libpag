/////////////////////////////////////////////////////////////////////////////////////////////////
//
//  Tencent is pleased to support the open source community by making libpag available.
//
//  Copyright (C) 2023 THL A29 Limited, a Tencent company. All rights reserved.
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

#include "BitmapBuffer.h"
#include "base/utils/TGFXCast.h"
#include "platform/Platform.h"
#include "tgfx/core/Bitmap.h"

namespace pag {
class BitmapWrapper : public BitmapBuffer {
 public:
  explicit BitmapWrapper(tgfx::Bitmap bitmap) : bitmap(std::move(bitmap)) {
  }

  void* lockPixels() override {
    return bitmap.lockPixels();
  }

  void unlockPixels() override {
    bitmap.unlockPixels();
  }

  const tgfx::ImageInfo& info() const override {
    return bitmap.info();
  }

  tgfx::HardwareBufferRef getHardwareBuffer() const override {
    return bitmap.getHardwareBuffer();
  }

 private:
  tgfx::Bitmap bitmap = {};
};

class PixelWrapper : public BitmapBuffer {
 public:
  PixelWrapper(const tgfx::ImageInfo& info, void* pixels) : _info(info), pixels(pixels) {
  }

  void* lockPixels() override {
    return pixels;
  }

  void unlockPixels() override {
  }

  const tgfx::ImageInfo& info() const override {
    return _info;
  }

  tgfx::HardwareBufferRef getHardwareBuffer() const override {
    return nullptr;
  }

 private:
  tgfx::ImageInfo _info = {};
  void* pixels = nullptr;
};

std::shared_ptr<BitmapBuffer> BitmapBuffer::Make(int width, int height) {
  auto buffer = Platform::Current()->makeBitmap(width, height);
  if (buffer != nullptr) {
    return buffer;
  }
  tgfx::Bitmap bitmap(width, height);
  if (bitmap.isEmpty()) {
    return nullptr;
  }
  return std::make_shared<BitmapWrapper>(std::move(bitmap));
}

std::shared_ptr<BitmapBuffer> BitmapBuffer::Wrap(const tgfx::ImageInfo& info, void* pixels) {
  if (info.isEmpty() || pixels == nullptr) {
    return nullptr;
  }
  return std::make_shared<PixelWrapper>(info, pixels);
}

int BitmapBuffer::width() const {
  return info().width();
}

int BitmapBuffer::height() const {
  return info().height();
}

ColorType BitmapBuffer::colorType() const {
  return ToPAG(info().colorType());
}

AlphaType BitmapBuffer::alphaType() const {
  return ToPAG(info().alphaType());
}

size_t BitmapBuffer::rowBytes() const {
  return info().rowBytes();
}

tgfx::NativeImageRef BitmapBuffer::makeNativeImage() {
  return nullptr;
}
}  // namespace pag

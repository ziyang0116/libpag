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

#pragma once

#include "pag/pag.h"
#include "tgfx/core/Bitmap.h"
#include "tgfx/platform/HardwareBuffer.h"
#include "tgfx/platform/NativeImage.h"

namespace pag {
class BitmapBuffer : public PAGBitmap {
 public:
  /**
   * Creates a new BitmapBuffer width specified width and height. Returns nullptr if the size is not
   * greater than zero or too big.
   */
  static std::shared_ptr<BitmapBuffer> Make(int width, int height);

  /**
   * Creates a new BitmapBuffer with specified ImageInfo and pixels. Returns nullptr if ImageInfo is
   * empty or the pixels are nullptr.
   */
  static std::shared_ptr<BitmapBuffer> Wrap(const tgfx::ImageInfo& info, void* pixels);

  int width() const override;

  int height() const override;

  size_t rowBytes() const override;

  ColorType colorType() const override;

  AlphaType alphaType() const override;

  /**
   * Returns an ImageInfo describing the width, height, color type, alpha type, and row bytes of the
   * BitmapBuffer.
   */
  virtual const tgfx::ImageInfo& info() const = 0;

  /**
   * Retrieves the backing hardware buffer. This method does not acquire any additional reference to
   * the returned hardware buffer. Returns nullptr if the BitmapBuffer is not backed by a hardware
   * buffer.
   */
  virtual tgfx::HardwareBufferRef getHardwareBuffer() const = 0;

  /**
   * Creates a native image object from the BitmapBuffer. Returns nullptr if the current platform
   * has no native image support.
   */
  virtual tgfx::NativeImageRef makeNativeImage();
};
}  // namespace pag

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

#include "JNIHelper.h"
#include "rendering/BitmapBuffer.h"

namespace pag {
class NativeBitmap : public BitmapBuffer {
 public:
  static void InitJNI(JNIEnv* env);

  static std::shared_ptr<NativeBitmap> Make(int width, int height);

  ~NativeBitmap() override;

  const tgfx::ImageInfo& info() const override {
    return _info;
  }

  tgfx::HardwareBufferRef getHardwareBuffer() const override {
    return hardwareBuffer;
  }

  tgfx::NativeImageRef makeNativeImage() override;

  void* lockPixels() override;

  void unlockPixels() override;

 private:
  std::mutex locker = {};
  tgfx::ImageInfo _info = {};
  tgfx::HardwareBufferRef hardwareBuffer = nullptr;
  Global<jobject> bitmap = {};

  explicit NativeBitmap(const tgfx::ImageInfo& info) : _info(info) {
  }
};
}  // namespace pag

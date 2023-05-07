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

#include "NativeBitmap.h"
#include <CoreGraphics/CoreGraphics.h>
#import <VideoToolbox/VideoToolbox.h>

namespace pag {

std::shared_ptr<NativeBitmap> NativeBitmap::Make(int width, int height) {
  if (width <= 0 || height <= 0) {
    return nullptr;
  }
  auto hardwareBuffer = tgfx::HardwareBufferAllocate(width, height);
  auto info = tgfx::HardwareBufferGetInfo(hardwareBuffer);
  if (info.isEmpty()) {
    return nullptr;
  }
  auto nativeBitmap = std::shared_ptr<NativeBitmap>(new NativeBitmap(info));
  nativeBitmap->hardwareBuffer = hardwareBuffer;
  return nativeBitmap;
}

NativeBitmap::~NativeBitmap() {
  tgfx::HardwareBufferRelease(hardwareBuffer);
}

tgfx::NativeImageRef NativeBitmap::makeNativeImage() {
  CGImageRef image = nil;
  VTCreateCGImageFromCVPixelBuffer(hardwareBuffer, nil, &image);
  CFAutorelease(image);
  return image;
}

void* NativeBitmap::lockPixels() {
  return tgfx::HardwareBufferLock(hardwareBuffer);
}

void NativeBitmap::unlockPixels() {
  tgfx::HardwareBufferUnlock(hardwareBuffer);
}
}  // namespace pag

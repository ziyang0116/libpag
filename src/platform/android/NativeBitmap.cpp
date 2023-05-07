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
#include <android/bitmap.h>
#include "base/utils/Log.h"
#include "tgfx/platform/android/AndroidBitmap.h"

namespace pag {
static Global<jclass> BitmapClass;
static jmethodID Bitmap_createBitmap;
static jmethodID Bitmap_wrapHardwareBuffer;
Global<jobject> BitmapConfig_ARGB;

void NativeBitmap::InitJNI(JNIEnv* env) {
  BitmapClass = env->FindClass("android/graphics/Bitmap");
  if (BitmapClass.get() == nullptr) {
    LOGE("Could not run NativeBitmap.InitJNI(), BitmapClass is not found!");
    return;
  }
  Bitmap_createBitmap =
      env->GetStaticMethodID(BitmapClass.get(), "createBitmap",
                             "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");
  Bitmap_wrapHardwareBuffer = env->GetMethodID(
      BitmapClass.get(), "wrapHardwareBuffer",
      "(Landroid/hardware/HardwareBuffer;Landroid/graphics/ColorSpace;)Landroid/graphics/Bitmap;");
  auto BitmapConfigClass = env->FindClass("android/graphics/Bitmap$Config");
  auto BitmapConfig_ARGB_8888 =
      env->GetStaticFieldID(BitmapConfigClass, "ARGB_8888", "Landroid/graphics/Bitmap$Config;");
  BitmapConfig_ARGB = env->GetStaticObjectField(BitmapConfigClass, BitmapConfig_ARGB_8888);
}

std::shared_ptr<NativeBitmap> NativeBitmap::Make(int width, int height) {
  if (width <= 0 || height <= 0) {
    return nullptr;
  }
  auto hardwareBuffer = tgfx::HardwareBufferAllocate(width, height);
  auto info = tgfx::HardwareBufferGetInfo(hardwareBuffer);
  if (!info.isEmpty()) {
    auto nativeBitmap = std::shared_ptr<NativeBitmap>(new NativeBitmap(info));
    nativeBitmap->hardwareBuffer = hardwareBuffer;
    return nativeBitmap;
  }
  JNIEnvironment environment;
  auto env = environment.current();
  if (env == nullptr) {
    return nullptr;
  }
  auto bitmap = env->CallStaticObjectMethod(BitmapClass.get(), Bitmap_createBitmap, width, height,
                                            BitmapConfig_ARGB.get());
  if (bitmap == nullptr) {
    env->ExceptionClear();
    return nullptr;
  }
  info = tgfx::AndroidBitmap::GetInfo(env, bitmap);
  if (info.isEmpty()) {
    return nullptr;
  }
  auto nativeBitmap = std::shared_ptr<NativeBitmap>(new NativeBitmap(info));
  nativeBitmap->bitmap = bitmap;
  return nativeBitmap;
}

NativeBitmap::~NativeBitmap() {
  if (hardwareBuffer != nullptr) {
    tgfx::HardwareBufferRelease(hardwareBuffer);
  }
}

tgfx::NativeImageRef NativeBitmap::makeNativeImage() {
  if (!bitmap.isEmpty()) {
    return bitmap.get();
  }
  if (hardwareBuffer != nullptr) {
    JNIEnvironment environment;
    auto env = environment.current();
    if (env == nullptr) {
      return nullptr;
    }
    auto hardwareBufferObject = tgfx::HardwareBufferToJavaObject(env, hardwareBuffer);
    if (hardwareBufferObject == nullptr) {
      env->ExceptionClear();
      return nullptr;
    }
    bitmap = env->CallStaticObjectMethod(BitmapClass.get(), Bitmap_wrapHardwareBuffer,
                                         hardwareBufferObject, nullptr);
    if (bitmap.isEmpty()) {
      env->ExceptionClear();
    }
  }
  return bitmap.get();
}

void* NativeBitmap::lockPixels() {
  if (hardwareBuffer != nullptr) {
    std::lock_guard<std::mutex> autoLock(locker);
    return tgfx::HardwareBufferLock(hardwareBuffer);
  }
  JNIEnvironment environment;
  auto env = environment.current();
  if (env == nullptr) {
    return nullptr;
  }
  void* pixels = nullptr;
  if (AndroidBitmap_lockPixels(env, bitmap.get(), &pixels) != 0) {
    env->ExceptionClear();
    LOGE("NativeBitmap::lockPixels() Failed to lockPixels() from a Java Bitmap!");
    return nullptr;
  }
  return pixels;
}

void NativeBitmap::unlockPixels() {
  if (hardwareBuffer != nullptr) {
    std::lock_guard<std::mutex> autoLock(locker);
    tgfx::HardwareBufferUnlock(hardwareBuffer);
    return;
  }
  JNIEnvironment environment;
  auto env = environment.current();
  if (env == nullptr) {
    return;
  }
  AndroidBitmap_unlockPixels(env, bitmap.get());
}
}  // namespace pag

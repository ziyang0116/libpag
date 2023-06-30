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

#include "SolidStrokeFilter.h"
#include "base/utils/TGFXCast.h"
#include "rendering/filters/utils/BlurTypes.h"

namespace pag {
static const char SOLID_STROKE_FRAGMENT_SHADER[] = R"(
        #version 100
        precision highp float;
        uniform sampler2D uTextureInput;
        uniform vec3 uColor;
        uniform float uAlpha;
        uniform vec2 uSize;
        uniform float uIsHollow;
        uniform float uIsSolid;

        varying vec2 vertexColor;

        const float PI = 3.1415926535;

        float check(vec2 point) {
            vec2 result = step(point, vec2(1.0)) * step(vec2(0.0), point);
            return step(0.5, result.x * result.y);
        }

        void main()
        {
            vec2 point = vertexColor;
            vec4 srcColor = texture2D(uTextureInput, point);
            float alphaSum = srcColor.a * check(point);
            for (float i = 0.0; i <= 180.0; i += 11.25) {
                float arc = i * PI / 180.0;
                float measureX = cos(arc) * uSize.x;
                float measureY = sqrt(pow(uSize.x, 2.0) - pow(measureX, 2.0)) * uSize.y / uSize.x;
                point = vertexColor + vec2(measureX, measureY);
                alphaSum += texture2D(uTextureInput, point).a * check(point);
                point = vertexColor + vec2(measureX, -measureY);
                alphaSum += texture2D(uTextureInput, point).a * check(point);
            }
    
            vec4 result = vec4(uColor * uAlpha, uAlpha);
            result = (uIsHollow > 0.0 && srcColor.a > 0.0) ? vec4(0.0) : result;
            result = (uIsSolid > 0.0 && srcColor.a > 0.0) ? result : vec4(0.0);

            gl_FragColor = (alphaSum > 0.0) ? result : vec4(0.0);
        }
    )";

static const char SOLID_STROKE_THICK_FRAGMENT_SHADER[] = R"(
        #version 100
        precision highp float;
        uniform sampler2D uTextureInput;
        uniform vec3 uColor;
        uniform float uAlpha;
        uniform vec2 uSize;
        uniform float isHollow;
        uniform float uIsSolid;

        varying vec2 vertexColor;

        const float PI = 3.1415926535;

        float check(vec2 point) {
            vec2 result = step(point, vec2(1.0)) * step(vec2(0.0), point);
            return step(0.5, result.x * result.y);
        }

        void main()
        {
            vec2 point = vertexColor;
            vec4 srcColor = texture2D(uTextureInput, point);
            float alphaSum = srcColor.a * check(point);
            for (float i = 0.0; i <= 180.0; i += 11.25) {
                float arc = i * PI / 180.0;
                float measureX = cos(arc) * uSize.x;
                float measureY = sqrt(pow(uSize.x, 2.0) - pow(measureX, 2.0)) * uSize.y / uSize.x;
                point = vertexColor + vec2(measureX, measureY);
                alphaSum += texture2D(uTextureInput, point).a * check(point);
                point = vertexColor + vec2(measureX, -measureY);
                alphaSum += texture2D(uTextureInput, point).a * check(point);
                point = vertexColor + vec2(measureX / 2.0, measureY / 2.0);
                alphaSum += texture2D(uTextureInput, point).a * check(point);
                point = vertexColor + vec2(measureX / 2.0, -measureY / 2.0);
                alphaSum += texture2D(uTextureInput, point).a * check(point);
            }

            vec4 result = vec4(uColor * uAlpha, uAlpha);
            result = (uIsHollow > 0.0 && srcColor.a > 0.0) ? vec4(0.0) : result;
            result = (uIsSolid > 0.0 && srcColor.a > 0.0) ? result : vec4(0.0);
    
            gl_FragColor = (alphaSum > 0.0) ? result : vec4(0.0);
        }
    )";

SolidStrokeFilter::SolidStrokeFilter(SolidStrokeMode mode)
    : styleMode(mode) {
}

std::string SolidStrokeFilter::onBuildFragmentShader() {
  if (styleMode == SolidStrokeMode::Thick) {
    return SOLID_STROKE_THICK_FRAGMENT_SHADER;
  }
  return SOLID_STROKE_FRAGMENT_SHADER;
}

void SolidStrokeFilter::onPrepareProgram(tgfx::Context* context, unsigned program) {
  auto gl = tgfx::GLFunctions::Get(context);
  colorHandle = gl->getUniformLocation(program, "uColor");
  alphaHandle = gl->getUniformLocation(program, "uAlpha");
  sizeHandle = gl->getUniformLocation(program, "uSize");
  isHollowHandle = gl->getUniformLocation(program, "uIsHollow");
  isSolidHandle = gl->getUniformLocation(program, "uIsSolid");
}

void SolidStrokeFilter::onUpdateOption(SolidStrokeOption newOption) {
  option = newOption;
}

void SolidStrokeFilter::onUpdateParams(tgfx::Context* context, const tgfx::Rect& contentBounds,
                                       const tgfx::Point& filterScale) {
  auto color = ToTGFX(option.color);
  auto alpha = ToAlpha(option.opacity);

  auto spreadSizeX = option.spreadSize * filterScale.x;
  auto spreadSizeY = option.spreadSize * filterScale.y;
  spreadSizeX = std::min(spreadSizeX, STROKE_MAX_SPREAD_SIZE);
  spreadSizeY = std::min(spreadSizeY, STROKE_MAX_SPREAD_SIZE);
  auto gl = tgfx::GLFunctions::Get(context);
  gl->uniform3f(colorHandle, color.red, color.green, color.blue);
  gl->uniform1f(alphaHandle, alpha);
  gl->uniform2f(sizeHandle, spreadSizeX / contentBounds.width(),
                spreadSizeY / contentBounds.height());
  gl->uniform1f(isHollowHandle, option.isHollow);
  gl->uniform1f(isSolidHandle, option.isSolid);
}

std::vector<tgfx::Point> SolidStrokeFilter::computeVertices(const tgfx::Rect&,
                                                                 const tgfx::Rect& outputBounds,
                                                                 const tgfx::Point& filterScale) {
  std::vector<tgfx::Point> vertices = {};
  tgfx::Point contentPoint[4] = {{outputBounds.left, outputBounds.bottom},
                                 {outputBounds.right, outputBounds.bottom},
                                 {outputBounds.left, outputBounds.top},
                                 {outputBounds.right, outputBounds.top}};

  auto deltaX = -option.spreadSize * filterScale.x;
  auto deltaY = -option.spreadSize * filterScale.y;

  tgfx::Point texturePoints[4] = {
      {deltaX, (outputBounds.height() + deltaY)},
      {(outputBounds.width() + deltaX), (outputBounds.height() + deltaY)},
      {deltaX, deltaY},
      {(outputBounds.width() + deltaX), deltaY}};
  for (int ii = 0; ii < 4; ii++) {
    vertices.push_back(contentPoint[ii]);
    vertices.push_back(texturePoints[ii]);
  }
  return vertices;
}
}  // namespace pag

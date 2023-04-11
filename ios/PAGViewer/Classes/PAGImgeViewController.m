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

#import "PAGImgeViewController.h"

#import <libpag/PAGImageView.h>

@interface PAGImgeViewController ()

@end

@implementation PAGImgeViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [self renderMutiplePAGImageView];
}

- (void)renderMutiplePAGImageView {
    float startY = 100;
    float itemWidth = self.view.bounds.size.width / 4;
    float itemHeight = itemWidth;
    for (int i = 0; i < 20; i++) {
        PAGImageView* pagImageView = [[PAGImageView alloc] initWithFrame:CGRectMake(itemWidth * (i % 4), (i / 4) * itemHeight + startY, itemWidth, itemHeight)];
        [pagImageView setPath:[[NSBundle mainBundle] pathForResource:[NSString stringWithFormat:@"%d", i] ofType:@"pag"]];
        [pagImageView setCacheAllFramesInMemory:NO];
        [self.view addSubview:pagImageView];
        [pagImageView setRepeatCount:-1];
        [pagImageView play];
    }
}

@end

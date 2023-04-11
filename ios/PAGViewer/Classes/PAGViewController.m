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

#import "PAGViewController.h"

#import <libpag/PAGView.h>

@interface PAGViewController ()
@property(nonatomic, strong) PAGView* pagView;

@end

@implementation PAGViewController

- (void)viewDidLoad {
    [super viewDidLoad];
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    if (![self.pagView isPlaying]) {
        [self.pagView play];
    }
}

- (void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear:animated];
    if ([self.pagView isPlaying]) {
        [self.pagView stop];
    }
}

- (void)setPath:(NSString *)path {
    PAGFile* pagFile = [PAGFile Load:path];
    if ([pagFile numTexts] > 0) {
        PAGText* textData = [pagFile getTextData:0];
        textData.text = @"hah哈 哈哈哈哈👌하";
        [pagFile replaceText:0 data:textData];
    }

    if ([pagFile numImages] > 0) {
        NSString* filePath = [[NSBundle mainBundle] pathForResource:@"rotation" ofType:@"jpg"];
        PAGImage* pagImage = [PAGImage FromPath:filePath];
        if (pagImage) {
            [pagFile replaceImage:0 data:pagImage];
        }
    }
    self.pagView = [[PAGView alloc] init];
    [self.view addSubview:self.pagView];
    self.pagView.frame = self.view.frame;
    [self.pagView setComposition:pagFile];
    [self.pagView setRepeatCount:-1];
    [self.pagView play];
}

- (void)touchesBegan:(NSSet*)touches withEvent:(UIEvent*)event {
    if ([self.pagView isPlaying]) {
        [self.pagView stop];
    } else {
        [self.pagView play];
    }
}


@end

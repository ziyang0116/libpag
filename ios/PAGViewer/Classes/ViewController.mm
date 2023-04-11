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

#import "ViewController.h"
#import "BackgroundView.h"
#import "PAGImgeViewController.h"
#import "PAGViewController.h"
#import <libpag/PAGVideoDecoder.h>

@interface ViewController () <UITabBarControllerDelegate>
@property (nonatomic, strong) UIImageView *imageView;
@property (nonatomic, strong) UILabel *label;
@property (weak, nonatomic) IBOutlet BackgroundView *bgView;
@property (nonatomic, strong) UITabBarController *tabBarController;

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    self.view.tintColor = [UIColor colorWithRed:0.00 green:0.35 blue:0.85 alpha:1.00];
    
    [self loadTabBar];
}


- (CGFloat)getSafeDistanceBottom {
    if (@available(iOS 13.0, *)) {
        NSSet *set = [UIApplication sharedApplication].connectedScenes;
        UIWindowScene *windowScene = [set anyObject];
        UIWindow *window = windowScene.windows.firstObject;
        return window.safeAreaInsets.bottom;
    } else if (@available(iOS 11.0, *)) {
        UIWindow *window = [UIApplication sharedApplication].windows.firstObject;
        return window.safeAreaInsets.bottom;
    }
    return 0;
}


- (void)loadTabBar {
    _tabBarController = [[UITabBarController alloc] init];
    _tabBarController.delegate = self;
    
    PAGViewController* vc1 = [[PAGViewController alloc] init];
    UITabBarItem *item1 = [[UITabBarItem alloc] init];
    NSString* path = [[NSBundle mainBundle] pathForResource:@"alpha" ofType:@"pag"];
    [vc1 setPath:path];
    item1.title = @"PAGView";
    [item1 setTitleTextAttributes:@{NSFontAttributeName:[UIFont systemFontOfSize:30]} forState:UIControlStateNormal];
    vc1.tabBarItem = item1;
    
    PAGImgeViewController* vc2 = [[PAGImgeViewController alloc] init];
    UITabBarItem *item2 = [[UITabBarItem alloc] init];
    item2.title = @"PAGImageView";
    [item2 setTitleTextAttributes:@{NSFontAttributeName:[UIFont systemFontOfSize:30]} forState:UIControlStateNormal];
    vc2.tabBarItem = item2;
    
    _tabBarController.viewControllers = [NSArray arrayWithObjects:vc1, vc2, nil];
    _tabBarController.view.frame = CGRectMake(0, 0, self.view.frame.size.width, self.view.frame.size.height - [self getSafeDistanceBottom]);
    
    [self.view addSubview:_tabBarController.view];
}

- (BOOL)tabBarController:(UITabBarController *)tabBarController shouldSelectViewController:(UIViewController *)viewController {
    return YES;
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
}

@end

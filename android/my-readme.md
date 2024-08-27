### 发布

在android目录下建local.properties文件

```shell
REPO_URL=
REPO_USER_NAME=
REPO_USER_PASS=
```

修改libpag/build.gradle的version

先在主目录执行：

```shell
./sync_deps.sh
```
然后到android目录下执行：

```bash

./gradlew :libpag:assembleRelease
# push to local
./gradlew :libpag:publishReleasePublicationToMavenLocalRepository
# push to remote 
./gradlew :libpag:publishReleasePublicationToMavenRepository
```
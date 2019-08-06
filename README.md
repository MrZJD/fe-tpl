# fe-tpl 前端页面项目 脚手架 及 代码管理

本仓库包括以下功能代码

* 模板代码 数据 维护 (新建，修改，归档)
* 活动页项目代码 数据 维护 (新建，修改，归档，发布)
* 公共代码 维护 lib : dll / vendor
* 公共组件维护 shard
* 以上功能脚手架 打包脚本 scripts

### 本地开发 映射规则 修改 nginx.conf

conf/project/xingguang.conf
conf/ssl/xingguang.conf

指定位置添加映射规则 本地server配置

```nginx
server {
    listen       80;
    server_name  $STATIC_SERVER_NAME;

    # ...
    rewrite ^/vmaker/lib/(.*)/(.*)$ /vmaker/lib/dist/$2;

    location ^~ /vmaker/lib/dist {
        alias ${PROJECT_PATH}/lib/dist;
    }
    location ^~ /vmaker/mobile {
        alias ${PROJECT_PATH}/dist/mobile/html/;
    }
    location ^~ /vmaker/pc {
        alias ${PROJECT_PATH}/dist/pc/html/;
    }
    # ...
}
server {
    listen       80;
    server_name  $MOBILE_SERVER_NAME;

    # ...
    # vmaker
    location ^~ /dist/vmaker/ {
        root ${PROJECT_PATH}/dist/mobile/html/;
    }
    # ...
}
server {
    listen       80;
    server_name  $PC_SERVER_NAME;

    # vmaker
    location ^~ /vmaker/ {
        root ${PROJECT_PATH}/dist/pc/html/;
    }
}
```

### Usage 使用方法

新建模板 - (自动新建分支)
```shell
npm run new:tpl
```

新建活动页 - (自动新建分支)
```shell
npm run new:page
```

模板/活动页 本地开发 (开发无需区分 模板/活动页 区别)
```
npm run dev
```

活动页 构建 (模板无构建流程)
```
npm run build
```

发布活动页 (test / trunk 都为该命令)
```shell
npm run pub:page
```

模板/活动页 归档 - (自动merge master)
```shell
npm run archive # 活动页 (生命周期结束后归档)
npm run archive:tpl # 模板 (模板开发完成后归档)
```

模板/活动页 从归档中恢复
```shell
npm run recover # 已有归档活动修改
npm run recover:tpl # 模板逻辑修改 (! 注意: 一般不存在模板修改，如果主逻辑有变动，应新建一个模板版本，而不是修改已有版本 )
```

模板 从归档新建
```shell
npm run builtin
```

### lib: dll vendor 管理

> dll vendor 需要版本管理 (即同时存在多个版本多个功能。请在CHANGELOG.md中进行标注。)

请切换至 lib 分支进行 dll vendor 模块的代码维护。修改发布完成后，应merge至主版本。（并同步至各个待发布的page分支）

**lib 目录 代码分支的归档操作 需要手动执行! 并手动确认其正确性。**

**src引用dll vendor并不是直接引用lib目录下文件，而是通过版本号和测试/线上环境建立关系。所以当lib中找不到对应方法时，应去对应lib分支下查找。后续会通过@types建立关系。**

```shell
git pull
git checkout lib_v1
```

开发
```shell
npm run dev:lib
```

构建 (test / trunk 都为该命令)
```shell
npm run build:lib
```

发布 (test / trunk 都为该命令)
```shell
npm run pub:lib
```

### 其他功能开发

如脚本修改 其他功能模块 全局组件添加 可直接新建feature分支进行开发

### 目录说明

- lib (dll vendor源码)
- packages (外部包 = 相当于内嵌的node_modules)
- page (活动页面项目归档)
- scripts (脚本)
- shared (公共组件 函数库)
- src (当前模板/页面项目 源码)
- templates (模板归档)
- test (测试用例)

### Q&A

#### 1. 如何复用模板 ?

> 可分为两个类型：
> 1. 需求复用：如定制活动v1/v2。
> 2. 定制化开发模板：如图片页，常用榜单页。可作为开发基础。

#### 2. 组件库 工具库 如何复用 ?

> 主要观察是否有可分离性。若每次都需要小部分修改，可以建一个基础版本，在src内部复制一份，作为修改。
> 若每次功能相同，可以直接引入shared中的代码；

#### 3. sourcemap ?

> 目前各个版本的各个输出 都没有 map文件输出。后续可以添加。

#### 4. webpack 打包类型

> 分为四类：
> 1. pure打包，即不引用任何外部 dll vendor
> 2. pc打包，引入dll.web.js vendor.web.js
> 3. mobile打包，引入dll.mobile.js vendor.mobile.js
> 4. PC & Mobile打包。

#### 5. lib发布为何需要手动同步git仓库 ?

> lib/version.json 记录了 lib 相关版本号信息。如果不同步发布，可能存在信息延迟，导致覆盖别人发布的版本。

#### 6. 关于 分支 项目名重复 导致的覆盖问题 ?

> 因为重复名的检测基于 pages/pages.json templates/templates.json 两个文件记录。如果数据没有同步，如存在两个git本地仓库的同名分支，可能会存在归档覆盖问题。若出现此情况，可以npm run recover恢复后分支，git reset恢复到覆盖版本后 重命名分支项目 后再归档。（可通过先在测试、线上环境访问对应文件，避免新建后覆盖）

### Reference

#### 配置相关

* [html minifier html压缩选项](https://github.com/kangax/html-minifier#options-quick-reference)

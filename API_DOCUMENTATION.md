# 3X 教育平台 API 文档

本文档提供 3X 教育平台后端 API 的详细说明。

## 基础信息

- **基础 URL**: `/api`
- **请求格式**: JSON
- **响应格式**: JSON
- **认证**: 大多数 API 需要 JWT token 认证
- **默认分页**: `page=1&limit=10`

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

### 分页响应

```json
{
  "success": true,
  "message": "获取数据成功",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 50,
    "totalPages": 5
  }
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误信息",
  "errorCode": "ERROR_CODE"
}
```

## 错误码

| 错误码 | 描述 |
|--------|------|
| VALIDATION_ERROR | 输入验证错误 |
| SERVER_ERROR | 服务器内部错误 |
| UNAUTHORIZED | 未授权访问 |
| NOT_FOUND | 资源不存在 |
| DUPLICATE_ENTRY | 重复的数据 |

## 认证 API

### 注册用户

- **URL**: `/api/auth/register`
- **方法**: `POST`
- **访问权限**: 公开
- **描述**: 注册新用户

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| name | String | 是 | 用户姓名 |
| phone | String | 是 | 手机号码，格式：1XXXXXXXXXX |
| verificationCode | String | 是 | 手机验证码 |
| invitationCode | String | 否 | 邀请码 |
| role | String | 否 | 用户角色，可选值：student(默认), teacher, supervisor |

**成功响应**:

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60a1b2c3d4e5f6g7h8i9j0k1",
      "name": "张三",
      "phone": "13800138000",
      "role": "student"
    }
  }
}
```

### 发送验证码

- **URL**: `/api/auth/send-code`
- **方法**: `POST`
- **访问权限**: 公开
- **描述**: 发送短信验证码到指定手机号

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| phone | String | 是 | 手机号码，格式：1XXXXXXXXXX |

**成功响应**:

```json
{
  "success": true,
  "message": "验证码已发送",
  "data": null
}
```

### 验证短信验证码

- **URL**: `/api/auth/verify-code`
- **方法**: `POST`
- **访问权限**: 公开
- **描述**: 验证短信验证码是否有效

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| phone | String | 是 | 手机号码，格式：1XXXXXXXXXX |
| verificationCode | String | 是 | 手机验证码 |

**成功响应**:

```json
{
  "success": true,
  "message": "验证成功",
  "data": {
    "verified": true
  }
}
```

### 用户登录

- **URL**: `/api/auth/login`
- **方法**: `POST`
- **访问权限**: 公开
- **描述**: 使用手机号和验证码登录

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| phone | String | 是 | 手机号码，格式：1XXXXXXXXXX |
| verificationCode | String | 是 | 手机验证码 |

**成功响应**:

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60a1b2c3d4e5f6g7h8i9j0k1",
      "name": "张三",
      "phone": "13800138000",
      "role": "student",
      "avatar": "http://example.com/avatar.jpg",
      "studentId": "S2023001"
    }
  }
}
```

### 获取当前用户信息

- **URL**: `/api/auth/me`
- **方法**: `GET`
- **访问权限**: 私有 (需要 JWT)
- **描述**: 获取当前登录用户的详细信息

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**成功响应**:

```json
{
  "success": true,
  "message": "获取用户资料成功",
  "data": {
    "_id": "60a1b2c3d4e5f6g7h8i9j0k1",
    "name": "张三",
    "phone": "13800138000",
    "role": "student",
    "avatar": "http://example.com/avatar.jpg",
    "studentId": "S2023001",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "enrolledCourses": ["60a1b2c3d4e5f6g7h8i9j0k1"],
    "membershipLevel": "basic"
  }
}
```

### 更新用户资料

- **URL**: `/api/auth/profile`
- **方法**: `PUT`
- **访问权限**: 私有 (需要 JWT)
- **描述**: 更新当前用户的个人资料

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| name | String | 否 | 用户姓名 |
| avatar | String | 否 | 头像 URL |
| studentId | String | 否 | 学生ID |

**成功响应**:

```json
{
  "success": true,
  "message": "更新个人资料成功",
  "data": {
    "_id": "60a1b2c3d4e5f6g7h8i9j0k1",
    "name": "张三",
    "phone": "13800138000",
    "role": "student",
    "avatar": "http://example.com/avatar.jpg",
    "studentId": "S2023001"
  }
}
```

### 修改密码

- **URL**: `/api/auth/password`
- **方法**: `PUT`
- **访问权限**: 私有 (需要 JWT)
- **描述**: 修改当前用户的密码

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| currentPassword | String | 是 | 当前密码 |
| newPassword | String | 是 | 新密码，至少6个字符 |

**成功响应**:

```json
{
  "success": true,
  "message": "密码修改成功",
  "data": null
}
```

## 管理员 API

### 管理员登录

- **URL**: `/api/admin/login`
- **方法**: `POST`
- **访问权限**: 公开
- **描述**: 管理员登录

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| username | String | 是 | 管理员用户名 |
| password | String | 是 | 管理员密码 |

**成功响应**:

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 获取管理员仪表盘数据

- **URL**: `/api/admin/dashboard`
- **方法**: `GET`
- **访问权限**: 私有 (管理员)
- **描述**: 获取管理员仪表盘统计数据

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**成功响应**:

```json
{
  "success": true,
  "message": "获取数据成功",
  "data": {
    "userCount": 500,
    "courseCount": 50,
    "paymentStats": {
      "totalRevenue": 10000,
      "thisMonth": 1500
    }
  }
}
```

### 获取所有用户

- **URL**: `/api/admin/users`
- **方法**: `GET`
- **访问权限**: 私有 (管理员)
- **描述**: 获取所有用户，支持分页和筛选

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**查询参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| page | Number | 否 | 页码，默认1 |
| limit | Number | 否 | 每页数量，默认10 |
| role | String | 否 | 按角色筛选 |
| search | String | 否 | 搜索关键词 |
| sort | String | 否 | 排序字段，默认createdAt |
| order | String | 否 | 排序方向，asc或desc，默认desc |

**成功响应**:

```json
{
  "success": true,
  "message": "获取用户列表成功",
  "data": [
    {
      "_id": "60a1b2c3d4e5f6g7h8i9j0k1",
      "name": "张三",
      "phone": "13800138000",
      "role": "student",
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 50,
    "totalPages": 5
  }
}
```

### 创建用户

- **URL**: `/api/admin/users`
- **方法**: `POST`
- **访问权限**: 私有 (管理员)
- **描述**: 创建新用户

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| name | String | 是 | 用户姓名 |
| phone | String | 是 | 手机号码，格式：1XXXXXXXXXX |
| password | String | 否 | 密码，默认为"123456" |
| role | String | 是 | 用户角色: student, teacher, supervisor, admin |
| studentId | String | 否 | 学生ID |
| region | String | 否 | 地区 |

**成功响应**:

```json
{
  "success": true,
  "message": "创建用户成功",
  "data": {
    "_id": "60a1b2c3d4e5f6g7h8i9j0k1",
    "name": "张三",
    "phone": "13800138000",
    "role": "student",
    "studentId": "S2023001",
    "region": "北京",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 更新用户

- **URL**: `/api/admin/users/:id`
- **方法**: `PUT`
- **访问权限**: 私有 (管理员)
- **描述**: 更新用户信息

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**URL 参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| id | String | 是 | 用户ID |

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| name | String | 否 | 用户姓名 |
| phone | String | 否 | 手机号码 |
| role | String | 否 | 用户角色 |
| studentId | String | 否 | 学生ID |
| region | String | 否 | 地区 |
| isActive | Boolean | 否 | 是否激活 |
| membershipLevel | String | 否 | 会员等级 |

**成功响应**:

```json
{
  "success": true,
  "message": "更新用户成功",
  "data": {
    "_id": "60a1b2c3d4e5f6g7h8i9j0k1",
    "name": "张三",
    "phone": "13800138000",
    "role": "student",
    "studentId": "S2023001",
    "region": "上海",
    "isActive": true,
    "membershipLevel": "premium"
  }
}
```

### 删除用户

- **URL**: `/api/admin/users/:id`
- **方法**: `DELETE`
- **访问权限**: 私有 (管理员)
- **描述**: 删除用户

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**URL 参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| id | String | 是 | 用户ID |

**成功响应**:

```json
{
  "success": true,
  "message": "删除用户成功",
  "data": null
}
```

### 用户批量导入

- **URL**: `/api/admin/users/import`
- **方法**: `POST`
- **访问权限**: 私有 (管理员)
- **描述**: 批量导入用户

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**请求参数**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| file | File | 是 | Excel/CSV文件 |

**成功响应**:

```json
{
  "success": true,
  "message": "批量导入成功",
  "data": null
}
```

### 用户导出

- **URL**: `/api/admin/users/export`
- **方法**: `GET`
- **访问权限**: 私有 (管理员)
- **描述**: 导出用户数据

**请求头**:

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | String | 是 | Bearer token |

**成功响应**:

```json
{
  "success": true,
  "message": "导出成功",
  "data": {
    "url": "export_url.csv"
  }
}
``` 
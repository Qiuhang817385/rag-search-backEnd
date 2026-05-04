import { SetMetadata } from '@nestjs/common';

/** 标记路由无需 Session（与全局 SessionGuard 配合） */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

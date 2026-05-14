import { SetMetadata } from "@nestjs/common";
import type { Module, Permission } from "@grwfit/shared-types";

export const PERMISSION_KEY = "requiredPermission";
export const RequiresPermission = (module: Module, action: Permission) =>
  SetMetadata(PERMISSION_KEY, { module, action });

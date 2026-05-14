import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { getPrismaClient } from "@grwfit/db";
import type { CreateBranchDto, UpdateBranchDto } from "./dto/create-branch.dto";

@Injectable()
export class BranchesService {
  async list(gymId: string) {
    const prisma = getPrismaClient();
    return prisma.branch.findMany({
      where: { gymId },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });
  }

  async create(gymId: string, dto: CreateBranchDto, actorId: string) {
    const prisma = getPrismaClient();

    const branch = await prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        // Unset any existing primary branch
        await tx.branch.updateMany({ where: { gymId, isPrimary: true }, data: { isPrimary: false } });
      }
      return tx.branch.create({
        data: {
          gymId,
          name: dto.name,
          address: (dto.address as object) ?? {},
          phone: dto.phone ?? null,
          isPrimary: dto.isPrimary ?? false,
        },
      });
    });

    await prisma.auditLog.create({
      data: { gymId, actorId, actorType: "staff", action: "create", entity: "branches", entityId: branch.id },
    });

    return branch;
  }

  async update(gymId: string, branchId: string, dto: UpdateBranchDto, actorId: string) {
    const prisma = getPrismaClient();
    const existing = await prisma.branch.findFirst({ where: { id: branchId, gymId } });
    if (!existing) throw new NotFoundException("Branch not found");

    const branch = await prisma.$transaction(async (tx) => {
      if (dto.isPrimary && !existing.isPrimary) {
        await tx.branch.updateMany({ where: { gymId, isPrimary: true }, data: { isPrimary: false } });
      }
      return tx.branch.update({
        where: { id: branchId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.address && { address: dto.address as object }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        },
      });
    });

    await prisma.auditLog.create({
      data: { gymId, actorId, actorType: "staff", action: "update", entity: "branches", entityId: branchId },
    });

    return branch;
  }

  async delete(gymId: string, branchId: string, actorId: string) {
    const prisma = getPrismaClient();
    const existing = await prisma.branch.findFirst({ where: { id: branchId, gymId } });
    if (!existing) throw new NotFoundException("Branch not found");
    if (existing.isPrimary) throw new ConflictException("Cannot delete the primary branch");

    const staffCount = await prisma.staffUser.count({ where: { branchId, isActive: true } });
    if (staffCount > 0) throw new ConflictException(`${staffCount} active staff are assigned to this branch`);

    await prisma.branch.delete({ where: { id: branchId } });

    await prisma.auditLog.create({
      data: { gymId, actorId, actorType: "staff", action: "delete", entity: "branches", entityId: branchId },
    });

    return { deleted: true };
  }
}

import { PrismaClient, StaffRole, MemberStatus } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

function generateQrCode(gymId: string, memberId: string): string {
  return `GRW-${gymId.slice(0, 8).toUpperCase()}-${memberId.slice(0, 8).toUpperCase()}`;
}

function indianPhone(n: number): string {
  return `+919${String(n).padStart(9, "0")}`;
}

async function main() {
  console.log("🌱 Seeding GrwFit demo data...");

  // 1. Create demo gym
  const gym = await prisma.gym.upsert({
    where: { slug: "iron-forge" },
    update: {},
    create: {
      name: "Iron Forge Fitness",
      slug: "iron-forge",
      subdomain: "iron-forge",
      phone: "+919876543210",
      planTier: "standard",
      status: "active",
      gstNo: "27AABCU9603R1ZX",
      address: {
        street: "42, MG Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India",
      },
      timezone: "Asia/Kolkata",
    },
  });
  console.log(`  ✓ Gym: ${gym.name} (${gym.id})`);

  // 2. Create primary branch
  const branch = await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      gymId: gym.id,
      name: "Main Branch",
      address: {
        street: "42, MG Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        country: "India",
      },
      phone: "+919876543210",
      isPrimary: true,
    },
  });
  console.log(`  ✓ Branch: ${branch.name}`);

  // 3. Create staff (owner, manager, trainer)
  const staffData: Array<{
    phone: string;
    name: string;
    role: StaffRole;
    email: string;
    commissionPct?: string;
  }> = [
    { phone: "+919800000001", name: "Rajesh Sharma", role: "owner", email: "rajesh@iron-forge.in" },
    { phone: "+919800000002", name: "Priya Patel", role: "manager", email: "priya@iron-forge.in" },
    { phone: "+919800000003", name: "Arjun Singh", role: "trainer", email: "arjun@iron-forge.in", commissionPct: "10" },
  ];

  const staff = [];
  for (const s of staffData) {
    const member = await prisma.staffUser.upsert({
      where: { gymId_phone: { gymId: gym.id, phone: s.phone } },
      update: {},
      create: {
        gymId: gym.id,
        branchId: branch.id,
        phone: s.phone,
        email: s.email,
        name: s.name,
        role: s.role,
        commissionPct: s.commissionPct ? parseFloat(s.commissionPct) : null,
        isActive: true,
      },
    });
    staff.push(member);
    console.log(`  ✓ Staff: ${member.name} (${member.role})`);
  }

  const trainer = staff.find((s) => s.role === "trainer")!;

  // 4. Create 20 members
  const memberNames = [
    "Amit Kumar", "Sneha Reddy", "Rohit Verma", "Ananya Iyer", "Vikram Nair",
    "Pooja Mehta", "Saurabh Joshi", "Kavita Rao", "Deepak Mishra", "Ritu Gupta",
    "Karan Malhotra", "Sunita Desai", "Rahul Kapoor", "Meera Pillai", "Akash Tiwari",
    "Divya Sharma", "Nikhil Pandey", "Shreya Agarwal", "Manish Soni", "Preethi Nair",
  ];

  const statuses: MemberStatus[] = ["active", "active", "active", "active", "expired", "frozen", "trial"];

  for (let i = 0; i < memberNames.length; i++) {
    const phone = indianPhone(i + 1);
    const memberId = crypto.randomUUID();
    const status = statuses[i % statuses.length] as MemberStatus;
    const joinedAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(joinedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.member.upsert({
      where: { gymId_phone: { gymId: gym.id, phone } },
      update: {},
      create: {
        id: memberId,
        gymId: gym.id,
        branchId: branch.id,
        phone,
        name: memberNames[i] as string,
        email: `${(memberNames[i] as string).toLowerCase().replace(/ /g, ".")}@example.com`,
        gender: i % 2 === 0 ? "male" : "female",
        status,
        joinedAt,
        expiresAt,
        assignedTrainerId: i % 3 === 0 ? trainer.id : null,
        qrCode: generateQrCode(gym.id, memberId),
        tags: i % 4 === 0 ? ["vip"] : [],
      },
    });
  }
  console.log(`  ✓ Members: 20 created`);

  // 5. Create platform super admin
  const bcryptHash = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234";
  await prisma.platformUser.upsert({
    where: { email: "admin@grwfit.com" },
    update: {},
    create: {
      email: "admin@grwfit.com",
      passwordHash: bcryptHash,
      name: "Platform Admin",
      role: "super_admin",
      isActive: true,
    },
  });
  console.log(`  ✓ Platform admin: admin@grwfit.com`);

  console.log("\n✅ Seed complete!");
  console.log(`\n  Gym ID:    ${gym.id}`);
  console.log(`  Branch ID: ${branch.id}`);
  console.log(`  Staff:     ${staff.length} users`);
  console.log(`  Members:   20 users`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

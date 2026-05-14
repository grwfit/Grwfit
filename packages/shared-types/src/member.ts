export type MemberStatus = "active" | "expired" | "frozen" | "trial";
export type MemberGender = "male" | "female" | "other" | "prefer_not_to_say";

export interface Member {
  id: string;
  gymId: string;
  branchId: string | null;
  phone: string;
  email: string | null;
  name: string;
  dob: string | null;
  gender: MemberGender | null;
  photoUrl: string | null;
  address: MemberAddress | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  goals: string[] | null;
  healthNotes: string | null;
  medicalConditions: string | null;
  currentPlanId: string | null;
  joinedAt: string;
  expiresAt: string | null;
  status: MemberStatus;
  assignedTrainerId: string | null;
  tags: string[];
  qrCode: string;
  doNotMessage: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

export interface MemberJwtPayload {
  sub: string;
  userId: string;
  gymId: string;
  type: "member";
  iat?: number;
  exp?: number;
}

export interface CreateMemberQuickDto {
  name: string;
  phone: string;
  planId?: string;
}

export interface CreateMemberFullDto extends CreateMemberQuickDto {
  email?: string;
  dob?: string;
  gender?: MemberGender;
  goals?: string[];
  healthNotes?: string;
  medicalConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: MemberAddress;
  assignedTrainerId?: string;
  branchId?: string;
}

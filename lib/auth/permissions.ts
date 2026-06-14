import "server-only";
import type { UserRole } from "@/lib/types";

export async function getUserRole(_userId: string): Promise<UserRole> {
  return "super_admin";
}

export async function getBuildingRole(_userId: string, _buildingId: string): Promise<UserRole> {
  return "super_admin";
}

export async function canViewBuilding(_userId: string, _buildingId: string) {
  return true;
}

export async function canControlBuilding(_userId: string, _buildingId: string) {
  return true;
}

export async function canEditBuilding(_userId: string, _buildingId: string) {
  return true;
}

export async function canEditEverything(_userId: string) {
  return true;
}

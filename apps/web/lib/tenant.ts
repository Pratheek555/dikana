import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { withUserContext } from "@repo/db";

export type ActiveTenant = {
  user: CurrentUser;
  membership: {
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
    tenant: {
      id: string;
      name: string;
      slug: string;
      alertEmail?: string | null;
      anomalyScheduleMins: number;
      createdAt: Date;
    };
  };
};

export async function getActiveTenant(): Promise<ActiveTenant | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const membership = await withUserContext(user.id, async (tx) =>
    tx.tenantMembership.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            alertEmail: true,
            anomalyScheduleMins: true,
            createdAt: true,
          },
        },
      },
    }),
  );

  if (!membership) {
    return null;
  }

  return { user, membership };
}

export async function requireActiveTenant() {
  const activeTenant = await getActiveTenant();

  if (!activeTenant) {
    redirect("/login");
  }

  return activeTenant;
}

export async function requireActiveTenantId() {
  const { membership } = await requireActiveTenant();

  return membership.tenant.id;
}

"use server";

import { prisma } from "@repo/db";
import { redirect } from "next/navigation";

import {
  clearUserSession,
  createUserSession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export type AuthFormState = {
  error?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email: string) {
  return email.toLowerCase();
}

function slugifyWorkspaceName(name: string) {
  const slug = name

    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "workspace";
}

async function createUniqueTenantSlug(workspaceName: string) {
  const baseSlug = slugifyWorkspaceName(workspaceName);
  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function readCurrentUser() {
  return getCurrentUser();
}

export async function signupUser(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = getString(formData, "name");
  const email = normalizeEmail(getString(formData, "email"));
  const password = getString(formData, "password");
  const workspaceName = getString(formData, "workspaceName");

  if (!name || !email || !password || !workspaceName) {
    return { error: "Name, email, password, and workspace name are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const tenantSlug = await createUniqueTenantSlug(workspaceName);

  const { user } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
      select: { id: true },
    });

    const tenant = await tx.tenant.create({
      data: {
        name: workspaceName,
        slug: tenantSlug,
        ownerId: user.id,
        alertEmail: email,
      },
      select: { id: true },
    });

    await tx.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenant.id}, true)
    `;

    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    await tx.dashboard.create({
      data: {
        tenantId: tenant.id,
        name: "Default dashboard",
        isDefault: true,
      },
    });

    return { user, tenant };
  });

  await createUserSession(user.id);
  redirect("/dashboard");
}

export async function loginUser(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(getString(formData, "email"));
  const password = getString(formData, "password");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (
    !user?.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    return { error: "Invalid email or password." };
  }

  await createUserSession(user.id);
  redirect("/dashboard");
}

export async function logoutUser() {
  await clearUserSession();
  redirect("/login");
}

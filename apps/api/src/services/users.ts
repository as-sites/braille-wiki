import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../lib/errors";

/**
 * Get all users.
 */
export async function getUsers() {
  // Stub implementation - use better-auth's queries if available
  // For now, return empty array as placeholder
  return [] as Array<{ id: string; name: string; email: string; role: string; createdAt: string }>;
}

/**
 * Get a single user by ID.
 */
export async function getUser(userId: string) {
  const users = await getUsers();
  const user = users.find((u: any) => u.id === userId);

  if (!user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  return user as { id: string; name: string; email: string; role: string; createdAt: string };
}

/**
 * Create a new user (admin only).
 */
export async function createUser(
  data: {
    name: string;
    email: string;
    role: "admin" | "editor";
  },
  currentUserRole?: string,
) {
  // Only admins can create users
  if (currentUserRole !== "admin") {
    throw new ForbiddenError("Only admins can create users");
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new ValidationError("Invalid email format");
  }

  // Stub implementation - actual user creation delegated to better-auth admin endpoints
  // Return a mock user for now
  return {
    id: Math.random().toString(),
    name: data.name,
    email: data.email,
    role: data.role,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Update a user's information and role.
 */
export async function updateUser(
  userId: string,
  data: {
    name?: string;
    role?: "admin" | "editor";
  },
  currentUser?: { id: string; role: string },
) {
  const user = await getUser(userId);

  // Guard: editors cannot change roles
  if (
    data.role &&
    currentUser?.role === "editor"
  ) {
    throw new ForbiddenError("Editors cannot change user roles");
  }

  // Guard: cannot demote the only admin
  if (data.role === "editor" && user.role === "admin") {
    const allUsers = await getUsers();
    const adminCount = allUsers.filter((u: any) => u.role === "admin").length;
    if (adminCount === 1) {
      throw new ForbiddenError("Cannot demote the only admin");
    }
  }

  // Return the updated user
  const updated: { id: string; name: string; email: string; role: string; createdAt: string } = {
    ...user,
    ...data,
  };
  return updated;
}

/**
 * Delete a user.
 */
export async function deleteUser(
  userId: string,
  currentUser?: { id: string; role: string },
) {
  const user = await getUser(userId);

  // Guard: cannot delete yourself
  if (userId === currentUser?.id) {
    throw new ForbiddenError("Cannot delete your own user account");
  }

  // Guard: editors cannot delete anyone, only admins can delete editors
  if (currentUser?.role === "editor") {
    throw new ForbiddenError("Only admins can delete users");
  }

  // Guard: cannot delete an admin as an editor (already caught above)
  if (currentUser?.role !== "admin" && user.role === "admin") {
    throw new ForbiddenError("Only admins can delete other admins");
  }

  // Stub implementation - actual deletion delegated to better-auth
  return user;
}

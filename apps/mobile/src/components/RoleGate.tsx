import React from 'react';
import type { MemberRole } from '@domo/shared';
import { useHousehold } from '@/lib/HouseholdProvider';

interface RoleGateProps {
  allow: MemberRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Renders children only for the given roles — the UI-layer half of RBAC (RLS is the enforced half). */
export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { role } = useHousehold();
  if (!role || !allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  canViewProducts: boolean;
  canEditProducts: boolean;
  canViewSupplies: boolean;
  canEditSupplies: boolean;
  canViewExpenses: boolean;
  canEditExpenses: boolean;
  canUseCalculator: boolean;
  canManageScenarios: boolean;
  canViewDashboard: boolean;
  canManageConfig: boolean;
  canManageUsers: boolean;
  /**
   * Computed by the back: true for ADMIN, whose permissions are always all on
   * and cannot be edited. The client only paints it (D-19).
   */
  permissionsLocked: boolean;
  userCount: number;
}

export interface RoleOption {
  id: string;
  name: string;
}

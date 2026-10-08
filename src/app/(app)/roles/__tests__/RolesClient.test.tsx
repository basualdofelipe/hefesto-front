import { fireEvent, render, screen, within } from '@testing-library/react';

jest.mock('next-auth/react', () => ({
  useSession: (): unknown => ({
    data: { accessToken: 'fake-token' },
    status: 'authenticated',
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: (): { refresh: jest.Mock } => ({ refresh: jest.fn() }),
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { RolesClient } from '../RolesClient';
import type { RoleRow } from '@/types/role';

const ADMIN_ROLE_ID = '33333333-3333-4333-8333-333333333333';
const USER_ROLE_ID = '55555555-5555-4555-8555-555555555555';

const PERMISSION_COUNT = 11;

const adminRole: RoleRow = {
  id: ADMIN_ROLE_ID,
  name: 'ADMIN',
  description: 'Administrador',
  isSystem: true,
  canViewProducts: true,
  canEditProducts: true,
  canViewSupplies: true,
  canEditSupplies: true,
  canViewExpenses: true,
  canEditExpenses: true,
  canUseCalculator: true,
  canManageScenarios: true,
  canViewDashboard: true,
  canManageConfig: true,
  canManageUsers: true,
  permissionsLocked: true,
  userCount: 1,
};

const userRole: RoleRow = {
  id: USER_ROLE_ID,
  name: 'USER',
  description: null,
  isSystem: true,
  canViewProducts: false,
  canEditProducts: false,
  canViewSupplies: false,
  canEditSupplies: false,
  canViewExpenses: false,
  canEditExpenses: false,
  canUseCalculator: true,
  canManageScenarios: false,
  canViewDashboard: false,
  canManageConfig: false,
  canManageUsers: false,
  permissionsLocked: false,
  userCount: 3,
};

function rowOf(roleName: string): HTMLElement {
  const row = screen.getByText(roleName).closest('tr');
  if (!row) throw new Error(`No table row for role ${roleName}`);
  return row;
}

async function openEditDialogFor(roleName: string): Promise<HTMLElement[]> {
  fireEvent.click(
    within(rowOf(roleName)).getByRole('button', { name: 'Editar' }),
  );
  const dialog = await screen.findByRole('dialog');
  return within(dialog).getAllByRole('switch');
}

describe('RolesClient permission lock (R10, D-19)', () => {
  it('opens a locked role with all permission switches checked and disabled', async () => {
    render(<RolesClient initialRoles={[adminRole, userRole]} />);

    const switches = await openEditDialogFor('ADMIN');

    expect(switches).toHaveLength(PERMISSION_COUNT);
    for (const permissionSwitch of switches) {
      expect(permissionSwitch).toHaveAttribute('aria-checked', 'true');
      expect(permissionSwitch).toBeDisabled();
    }
  });

  it('opens an unlocked role with editable permission switches', async () => {
    render(<RolesClient initialRoles={[adminRole, userRole]} />);

    const switches = await openEditDialogFor('USER');

    expect(switches).toHaveLength(PERMISSION_COUNT);
    for (const permissionSwitch of switches) {
      expect(permissionSwitch).toBeEnabled();
    }
    expect(
      screen.getByRole('switch', { name: 'Usar calculadora' }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});

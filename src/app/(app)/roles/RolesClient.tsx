'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiClientFetch } from '@/lib/api-client';
import type { RoleRow } from '@/types/role';

const PERMISSION_KEYS = [
  'canViewProducts',
  'canEditProducts',
  'canViewSupplies',
  'canEditSupplies',
  'canViewExpenses',
  'canEditExpenses',
  'canUseCalculator',
  'canManageScenarios',
  'canViewDashboard',
  'canManageConfig',
  'canManageUsers',
] as const;

function countPermissions(role: RoleRow): number {
  return PERMISSION_KEYS.filter((k) => role[k]).length;
}

const roleSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'Maximo 100 caracteres'),
  description: z.string().max(255, 'Maximo 255 caracteres'),
  canViewProducts: z.boolean(),
  canEditProducts: z.boolean(),
  canViewSupplies: z.boolean(),
  canEditSupplies: z.boolean(),
  canViewExpenses: z.boolean(),
  canEditExpenses: z.boolean(),
  canUseCalculator: z.boolean(),
  canManageScenarios: z.boolean(),
  canViewDashboard: z.boolean(),
  canManageConfig: z.boolean(),
  canManageUsers: z.boolean(),
});

type RoleFormData = z.infer<typeof roleSchema>;

type PermissionBooleanKey = Extract<keyof RoleFormData, `can${string}`>;

const VIEW_EDIT_PAIRS: [PermissionBooleanKey, PermissionBooleanKey][] = [
  ['canViewProducts', 'canEditProducts'],
  ['canViewSupplies', 'canEditSupplies'],
  ['canViewExpenses', 'canEditExpenses'],
];

interface RolesClientProps {
  initialRoles: RoleRow[];
}

export function RolesClient({ initialRoles }: RolesClientProps): ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      canViewProducts: false,
      canEditProducts: false,
      canViewSupplies: false,
      canEditSupplies: false,
      canViewExpenses: false,
      canEditExpenses: false,
      canUseCalculator: false,
      canManageScenarios: false,
      canViewDashboard: false,
      canManageConfig: false,
      canManageUsers: false,
    },
  });

  function handlePermissionToggle(
    field: PermissionBooleanKey,
    value: boolean,
  ): void {
    setValue(field, value);

    for (const [viewKey, editKey] of VIEW_EDIT_PAIRS) {
      if (field === editKey && value === true) {
        // Turning ON edit -> auto-check view
        setValue(viewKey, true);
      }
      if (field === viewKey && value === false) {
        // Turning OFF view -> auto-uncheck edit
        setValue(editKey, false);
      }
    }
  }

  function openCreateDialog(): void {
    setEditingRole(null);
    reset({
      name: '',
      description: '',
      canViewProducts: false,
      canEditProducts: false,
      canViewSupplies: false,
      canEditSupplies: false,
      canViewExpenses: false,
      canEditExpenses: false,
      canUseCalculator: false,
      canManageScenarios: false,
      canViewDashboard: false,
      canManageConfig: false,
      canManageUsers: false,
    });
    setDialogOpen(true);
  }

  function openEditDialog(role: RoleRow): void {
    setEditingRole(role);
    reset({
      name: role.name,
      description: role.description ?? '',
      canViewProducts: role.canViewProducts,
      canEditProducts: role.canEditProducts,
      canViewSupplies: role.canViewSupplies,
      canEditSupplies: role.canEditSupplies,
      canViewExpenses: role.canViewExpenses,
      canEditExpenses: role.canEditExpenses,
      canUseCalculator: role.canUseCalculator,
      canManageScenarios: role.canManageScenarios,
      canViewDashboard: role.canViewDashboard,
      canManageConfig: role.canManageConfig,
      canManageUsers: role.canManageUsers,
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(role: RoleRow): void {
    setDeletingRole(role);
    setDeleteDialogOpen(true);
  }

  async function onSubmit(data: RoleFormData): Promise<void> {
    try {
      if (editingRole) {
        const updated = await apiClientFetch<{ data: RoleRow }>(
          `/api/roles/${editingRole.id}`,
          token,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          },
        );
        setRoles((prev) =>
          prev.map((r) => (r.id === editingRole.id ? updated.data : r)),
        );
        toast.success('Rol actualizado');
      } else {
        const created = await apiClientFetch<{ data: RoleRow }>(
          '/api/roles',
          token,
          {
            method: 'POST',
            body: JSON.stringify(data),
          },
        );
        setRoles((prev) => [...prev, created.data]);
        toast.success('Rol creado');
      }
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editingRole
            ? 'Error al guardar cambios'
            : 'Error al crear rol',
      );
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingRole) return;
    setIsDeleting(true);
    try {
      await apiClientFetch(`/api/roles/${deletingRole.id}`, token, {
        method: 'DELETE',
      });
      setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id));
      toast.success('Rol eliminado');
      setDeleteDialogOpen(false);
      setDeletingRole(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar rol',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const permissionCount = editingRole ? countPermissions(editingRole) : 0;
  void permissionCount;

  const permissionSections: {
    label: string;
    fields: { key: PermissionBooleanKey; label: string }[];
  }[] = [
    {
      label: 'Productos',
      fields: [
        { key: 'canViewProducts', label: 'Ver productos' },
        { key: 'canEditProducts', label: 'Editar productos' },
      ],
    },
    {
      label: 'Insumos y proveedores',
      fields: [
        { key: 'canViewSupplies', label: 'Ver insumos y proveedores' },
        { key: 'canEditSupplies', label: 'Editar insumos y proveedores' },
      ],
    },
    {
      label: 'Gastos',
      fields: [
        { key: 'canViewExpenses', label: 'Ver gastos' },
        { key: 'canEditExpenses', label: 'Editar gastos' },
      ],
    },
    {
      label: 'Herramientas',
      fields: [
        { key: 'canUseCalculator', label: 'Usar calculadora' },
        { key: 'canManageScenarios', label: 'Gestionar escenarios' },
        {
          key: 'canViewDashboard',
          label: 'Ver dashboard (proximamente)',
        },
      ],
    },
    {
      label: 'Administracion',
      fields: [
        { key: 'canManageConfig', label: 'Configurar Tiendanube' },
        { key: 'canManageUsers', label: 'Gestionar usuarios y roles' },
      ],
    },
  ];

  return (
    <>
      <div className='flex justify-end'>
        <Button onClick={openCreateDialog}>Crear rol</Button>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead className='w-[100px] text-center'>Usuarios</TableHead>
              <TableHead className='w-[120px] text-center'>Permisos</TableHead>
              <TableHead className='w-[200px] text-right'>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-muted-foreground h-16 text-center'
                >
                  No hay roles personalizados. Crea uno para asignar permisos
                  especificos.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => {
                const count = countPermissions(role);
                const badgeVariant =
                  count === 11
                    ? 'default'
                    : count === 0
                      ? 'outline'
                      : 'secondary';
                return (
                  <TableRow key={role.id}>
                    <TableCell className='font-semibold'>
                      <span className='flex items-center gap-2'>
                        {role.name}
                        {role.isSystem && (
                          <Badge variant='outline'>Sistema</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {role.description ?? '-'}
                    </TableCell>
                    <TableCell className='text-center'>
                      {role.userCount}
                    </TableCell>
                    <TableCell className='text-center'>
                      <Badge variant={badgeVariant}>{count}/11</Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openEditDialog(role)}
                        >
                          Editar
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='text-destructive'
                            onClick={() => openDeleteDialog(role)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Editar rol: ${editingRole.name}` : 'Crear rol'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            className='space-y-4'
          >
            <div className='max-h-[70vh] space-y-4 overflow-y-auto pr-1'>
              {/* Info section */}
              <div className='space-y-3'>
                <div className='space-y-2'>
                  <Label htmlFor='role-name'>
                    Nombre del rol <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='role-name'
                    {...register('name')}
                    placeholder='Ej: INVERSOR'
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className='text-destructive text-sm'>
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='role-description'>Descripcion</Label>
                  <Input
                    id='role-description'
                    {...register('description')}
                    placeholder='Descripcion opcional del rol'
                    disabled={isSubmitting}
                  />
                  {errors.description && (
                    <p className='text-destructive text-sm'>
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Permission sections */}
              {permissionSections.map((section, sectionIndex) => (
                <div key={section.label}>
                  <Separator />
                  <p className='text-muted-foreground pt-2 pb-1 text-sm font-semibold tracking-wide uppercase'>
                    {section.label}
                  </p>
                  <div className='space-y-1'>
                    {section.fields.map(({ key, label }) => (
                      <div
                        key={key}
                        className='flex items-center justify-between py-2'
                      >
                        <Label
                          htmlFor={`perm-${key}`}
                          className='text-sm font-normal'
                        >
                          {label}
                        </Label>
                        <Switch
                          id={`perm-${key}`}
                          checked={watch(key)}
                          onCheckedChange={(value) =>
                            handlePermissionToggle(key, value)
                          }
                          disabled={
                            isSubmitting ||
                            editingRole?.permissionsLocked === true
                          }
                        />
                      </div>
                    ))}
                  </div>
                  {sectionIndex === permissionSections.length - 1 && null}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                {editingRole ? 'Guardar cambios' : 'Crear rol'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara el rol &ldquo;{deletingRole?.name}&rdquo;. Esta
              accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeleting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Eliminar rol
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

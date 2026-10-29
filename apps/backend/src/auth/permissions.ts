import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';

export const ac = createAccessControl(defaultStatements);

// super_admin: boleh kelola user (create, set-role, ban, dst.)
export const super_admin = ac.newRole({ ...adminAc.statements });
// admin: tidak punya akses endpoint kelola user
export const admin = ac.newRole({ user: [], session: [] });

export const roles = { super_admin, admin };

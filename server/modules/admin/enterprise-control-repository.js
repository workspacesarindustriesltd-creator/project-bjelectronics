import { AdminControlRepository } from "./control-repository.js";
import { withTransaction } from "../../db.js";

export class EnterpriseAdminControlRepository extends AdminControlRepository {
  async setUserRoles(userId, roleCodes) {
    const updated = await withTransaction(async (connection) => {
      const [[user]] = await connection.execute(
        "SELECT id, role FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      if (!user || user.role !== "admin") return false;

      await connection.execute("DELETE FROM admin_user_roles WHERE user_id = ?", [userId]);
      for (const code of roleCodes) {
        await connection.execute(
          `INSERT IGNORE INTO admin_user_roles (user_id, role_id)
           SELECT ?, id FROM admin_roles WHERE code = ?`,
          [userId, code],
        );
      }
      return true;
    });

    return updated ? this.getAuthorization(userId) : null;
  }
}

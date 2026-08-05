import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  clearAdminSessionCookie,
  clearSessionCookie,
  createSession,
  requireAdmin,
  requireAuth,
  setAdminSessionCookie,
  setSessionCookie,
} from "../../auth.js";
import { parse } from "../../http/validate.js";
import { credentialsSchema, registerSchema } from "../shared/schemas.js";

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.created_at || user.createdAt,
});

async function safeAdminUser(user, adminControl) {
  const result = safeUser(user);
  if (!adminControl) return { ...result, roles: [], permissions: ["*"] };
  const authorization = await adminControl.getAuthorization(user.id);
  return { ...result, ...authorization };
}

export function createCustomerAuthRouter(repository) {
  const router = Router();

  router.post("/register", async (req, res) => {
    const data = parse(registerSchema, req.body);
    if (await repository.findUserByEmail(data.email)) {
      return res.status(409).json({ error: "An account already uses this email." });
    }

    const user = await repository.createUser({
      ...data,
      passwordHash: await bcrypt.hash(data.password, 12),
    });
    setSessionCookie(res, createSession(user));
    clearAdminSessionCookie(res);
    return res.status(201).json({ user });
  });

  router.post("/login", async (req, res) => {
    const data = parse(credentialsSchema, req.body);
    const user = await repository.findUserByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (user.role === "admin") {
      return res.status(403).json({ error: "This account cannot sign in through the customer portal." });
    }

    const result = safeUser(user);
    setSessionCookie(res, createSession(result));
    clearAdminSessionCookie(res);
    return res.json({ user: result });
  });

  router.post("/logout", (_req, res) => {
    clearSessionCookie(res);
    return res.status(204).end();
  });

  router.get("/me", requireAuth, async (req, res) => {
    const user = await repository.findUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ user: safeUser(user) });
  });

  return router;
}

export function createAdminAuthRouter(repository, { adminControl } = {}) {
  const router = Router();

  router.post("/login", async (req, res) => {
    const data = parse(credentialsSchema, req.body);
    const user = await repository.findUserByEmail(data.email);
    const valid = user?.role === "admin"
      && await bcrypt.compare(data.password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Administrator credentials are incorrect." });
    }

    const result = await safeAdminUser(user, adminControl);
    setAdminSessionCookie(
      res,
      createSession(result, "bj-electronics-admin", "2h"),
    );
    clearSessionCookie(res);
    await adminControl?.audit?.({
      actorUserId: user.id,
      action: "admin.email.login",
      entityType: "session",
      entityId: user.id,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });
    return res.json({ user: result });
  });

  router.get("/me", requireAdmin, async (req, res) => {
    const user = await repository.findUserById(req.user.sub);
    if (!user || user.role !== "admin") {
      return res.status(404).json({ error: "Administrator account not found." });
    }
    return res.json({ user: await safeAdminUser(user, adminControl) });
  });

  router.post("/logout", async (req, res) => {
    await adminControl?.audit?.({
      actorUserId: req.cookies?.bj_admin_session ? req.user?.sub || null : null,
      action: "admin.logout",
      entityType: "session",
      entityId: req.user?.sub || null,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    }).catch(() => undefined);
    clearAdminSessionCookie(res);
    return res.status(204).end();
  });

  return router;
}

import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

type LogActionParams = {
  session: SessionPayload;
  action: string;
  resource: string;
  resourceId?: string;
  before?: object;
  after?: object;
  ip?: string;
};

export async function logAction({
  session,
  action,
  resource,
  resourceId,
  before,
  after,
  ip,
}: LogActionParams) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.id,
        userEmail: session.email,
        userName: session.name,
        action,
        resource,
        resourceId,
        before: before as never,
        after: after as never,
        ip,
      },
    });
  } catch {
    // Ne jamais bloquer une action métier pour un log raté
  }
}

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "subjectUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "requestId" TEXT,
    "ipHash" TEXT,
    "source" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_subjectUserId_at_idx" ON "AuditEvent"("subjectUserId", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_action_at_idx" ON "AuditEvent"("action", "at");


-- Phase 27 §27k / §27a — append-only enforcement at the database. The application role may INSERT + SELECT
-- audit rows, never UPDATE or DELETE them (the §27h bonza_app role was granted full DML by default privileges;
-- this carves AuditEvent back out, exactly as BonzaCredit is in the §27h roles migration). Corrections are new
-- rows. The 7-year retention prune (jobs/retentionJob.js) must therefore run under bonza_migrate. The role is
-- created earlier in the chain (20261102300000_phase27h_db_roles_and_grants); guard so dev shadow DBs without
-- the role don't fail this migration.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'bonza_app') THEN
    GRANT SELECT, INSERT ON "AuditEvent" TO bonza_app;
    REVOKE UPDATE, DELETE ON "AuditEvent" FROM bonza_app;
  END IF;
END
$$;

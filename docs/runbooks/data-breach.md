# Runbook: Suspected personal-data breach

**Start the clock now.** Under UK GDPR, a notifiable personal-data breach must be reported to the ICO **within
72 hours** of becoming aware. This runbook is about speed and evidence, not perfection.

## 0. Declare (minute 0)
- Anyone who suspects a breach escalates immediately — do not wait to be sure. Note the **time of awareness**
  (this starts the 72h clock) and open an incident channel.
- Assign: an **incident lead**, a **comms owner**, and a **technical owner**.

## 1. Contain (first hour)
- Stop the bleeding: rotate the exposed credential (Secrets Manager → the affected `/bonza/<env>/...` secret,
  then redeploy), revoke the token/session, close the exposed endpoint, or block the source IP at Cloudflare.
- If a DB credential may be exposed: rotate it; the least-privilege roles (§27h) limit blast radius — `bonza_app`
  can't `DROP`, can't mutate the append-only ledgers, and `bonza_readonly` is SELECT-only.
- **Preserve evidence:** snapshot logs (CloudWatch), the relevant `AuditEvent` rows (§27k — who accessed/changed
  what, with `ipHash` and `request_id`), and any Sentry events. Do **not** delete anything.

## 2. Assess (what, who, how many)
- **What data?** Bonza minimises PII: Clerk owns identity (we store `User.id`, email, name, home airport). We
  **never store raw IPs** (only `sha256(ip+APP_SALT)`, §25d), never card numbers (Stripe), never passwords
  (Clerk). Loyalty balances + membership numbers are the sensitive set.
- **Who / how many?** Use the `AuditEvent` trail and access logs to scope the affected users.
- **Risk to individuals?** Financial/identity risk raises the bar for notification + informing users.

## 3. Report (within 72h of awareness)
- If the breach is **likely to result in a risk** to individuals: report to the **ICO** within 72h
  (ico.org.uk/for-organisations/report-a-breach). If it's **high risk**, also **inform affected users** without
  undue delay (comms owner drafts; keep it factual).
- If genuinely unlikely to be a risk: document the decision and reasoning (you may not need to notify, but you
  must be able to justify it).

## 4. Recover & learn
- Confirm containment held; restore any affected data from PITR if needed (see [db-failover](db-failover.md)).
- Blameless post-incident: what was exposed, why the control failed, and the fix. Update this runbook.

## Contacts
- ICO breach line + online form (see link above). Keep the DPO / legal contact in the team handbook (not here).

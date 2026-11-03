# Deployment attribution

Use ordinary customer-editable Azure metadata for provenance, not telemetry or a
SQL Apps runtime. Local-only work needs no Azure attribution check.

## Required version tag

`sqlapps-version` identifies the SQL Apps guidance version intentionally adopted
for generated infrastructure, not the app or API version. Read it from the actual
installed [`plugin.json`](../../../plugin.json) and record it once in the app's
`deployment.md`. Do not invent an unverifiable version; resolve the gap or record
an explicitly approved exception before claiming validation.

Merge that tag into each newly created in-scope tag-capable resource and new
resource group. Group tags are not inherited. Preserve the adopted version on
resume/redeployment; loading a newer plugin does not reattribute infrastructure.
Change it only through an intentional guidance/infrastructure update.

Preserve customer metadata and compare keys case-insensitively. Surface conflicting
values, tag-limit exhaustion and unsupported tagging before provisioning rather
than overwriting/deleting tags. Record approved opt-outs and unsupported resources
in the same deployment record. Do not tag existing/shared dependencies merely
because the app uses them; reattribution requires explicit scope approval.

## Optional resource suffix

The `sqlapps` product suffix is **optional**, not an acceptance requirement. Use
the customer's approved stable naming convention. If chosen, place environment
and uniqueness components before a final `-sqlapps` (or `sqlapps` for
alphanumeric-only names). Examples: `app-demo-dev-a1b2c3-sqlapps` and
`stdemodeva1b2c3sqlapps`. These are examples, not a resource checklist.

Validate actual provider length, characters, reserved names, scope and uniqueness
rules; retain service-mandated child names such as `default`. Do not introduce a
tracking identifier. **Preserve existing deployed names**: never rename, replace
or recreate resources merely to add or remove branding. New-template naming
changes are not a migration instruction.

## Verify during the approved deployment

Use the selected workflow's existing Bicep/Terraform tag maps and naming inputs.
During already requested/approved validation, compare actual in-scope metadata
with `deployment.md` using authorized CLI/API reads. Record results there alongside
resource-setting checks; do not create repeated handoff/readback records or a new
state file. Template declarations and tagged parents are not proof of resource
tags. Report mismatches and exceptions honestly; never broaden access, add paid
resources or rename/delete infrastructure to pass attribution.

## Privacy and measurement limits

Tags are plaintext; names appear in URLs, inventories, exports and logs. Use only
non-sensitive workload tokens, never personal, tenant, email or customer-data
identifiers. Attribution must not query customer data/metrics, enable diagnostics,
add SDKs/events/callbacks/collectors, create monitoring resources or grant access.
Separately requested operational monitoring has its own requirements and approvals.

The tag can indicate current accessible resource footprint by adopted guidance
version, not active usage, people, unique apps, deployment counts, local usage or
lifetime adoption. Editable tags, copied templates and deleted resources are not
tamper-resistant evidence. Names are only an optional secondary discovery aid.

This grants Microsoft no additional access and sends no SQL Apps usage report.
Azure Resource Graph sees only resources its querying principal may access.
Microsoft-side reporting would require an independently approved metadata source;
do not assume one exists or promise Microsoft-wide visibility.

## Official references

- [Azure tags: plaintext, inheritance, case semantics, limits, and support](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources).
- [Azure resource naming rules by provider](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules).
- [Azure Resource Graph overview and access requirements](https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview).

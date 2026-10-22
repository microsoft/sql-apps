# Deployment attribution

Identify infrastructure generated with SQL Apps using ordinary, customer-editable Azure metadata. This is provenance, not a SQL Apps management runtime or application telemetry.

## Attribution metadata

Use only this default attribution tag; its presence identifies SQL Apps:

| Tag | Value |
| --- | --- |
| `sqlapps-version` | SQL Apps guidance version adopted for the project's generated infrastructure |

Read the version from the actual plugin manifest, [`plugin.json`](../../../plugin.json), when generating or intentionally adopting the guidance. Persist it in the application's brief. It is not the application or DAB version. Do not invent a value when the manifest/version cannot be verified: report the gap and resolve it or record an explicitly approved exception before claiming attribution validation.

Preserve the recorded version on resume and redeployment. Merely loading a newer installed plugin must not relabel existing infrastructure. Change the recorded version only through an intentional guidance/infrastructure update; it is not a runtime version or a last-seen timestamp.

In the selected Azure workflow's generated infrastructure, merge the tag into the existing tag map of each newly created tag-capable resource and any newly created resource group. Resource-group tags are not inherited by their resources. Do not tag an existing/shared group or shared dependencies simply because an app uses them; reattribution requires explicit scope approval.

Preserve customer tags. Compare tag keys case-insensitively so a differently cased existing key does not create a duplicate; use the recorded version value exactly. Surface conflicting values or tag-limit exhaustion before provisioning rather than overwriting or deleting customer metadata. Record unsupported tagging and approved opt-outs as exceptions, not silent omissions. Do not add resources or permissions just to make attribution possible.

## Resource naming

The default resource-name suffix is `sqlapps`, using the same compact product token as the `sqlapps-version` tag. Append it as the final component of newly generated resource names, using the owning Azure workflow's naming and uniqueness helpers. Place any environment and uniqueness token before the final `sqlapps` suffix. Use `-sqlapps` when hyphens are allowed; append `sqlapps` directly for alphanumeric-only names.

| Resource, if required by the approved topology | Example name |
| --- | --- |
| New resource group | `rg-demo-dev-sqlapps` |
| Web app | `app-demo-dev-a1b2c3-sqlapps` |
| SQL logical server | `sql-demo-dev-a1b2c3-sqlapps` |
| Storage account | `stdemodeva1b2c3sqlapps` |

These examples are not a universal name generator or a provisioning checklist. Validate each actual resource type's length, allowed characters, scope, reserved names, and uniqueness rules. Storage account names, for example, allow only lowercase letters and digits and at most 24 characters. For constrained names, shorten the non-sensitive workload token rather than truncating the `sqlapps` suffix or required uniqueness token; record an override if the convention cannot fit. Keep names and generated uniqueness tokens stable across redeployments; do not introduce a product tracking identifier.

Customer naming requirements take precedence through a recorded override. Preserve service-mandated child names such as `default`; record nonconfigurable/unsupported names as exceptions rather than inventing an invalid name. Never rename or replace existing resources for attribution. Retrofitting tags onto existing resources also requires an explicitly approved scope.

## Carry and verify the contract

Record the adopted `sqlapps-version`, final `sqlapps` suffix naming pattern, and exceptions in the application brief and preserve the rules in its active host's durable project instructions. Explicitly include those choices in Azure planning, provisioning, validation, and redeployment handoffs alongside the approved topology and cost constraints.

Use the selected workflow's existing infrastructure configuration, such as Bicep or Terraform tag maps and naming inputs. Do not invent Rayfin configuration fields, a new deployment engine, or a SQL Apps state file. Local-only delivery requires no Azure sign-in, provisioning, or attribution checks against Azure.

During an already requested and approved deployment, read back actual resource tags and names using the owning Azure workflow's authorized tools. Compare each in-scope resource with the brief, including documented tag support and naming exceptions; a tagged parent or template declaration is not proof of child-resource metadata. Report mismatches as failed attribution validation and approved exceptions as exceptions. Do not rename/delete resources, broaden permissions, or enable paid services to make a check pass.

## Privacy and measurement limits

Tags are plaintext and names can appear in URLs, inventories, exports, and logs. Do not include personal, sensitive, or confidential information in either. Use a short, non-sensitive workload token, not a person, tenant, email, or customer-data identifier.

No runtime events, SDK instrumentation, callbacks, collectors, or new monitoring resources are added for attribution. Do not query customer data or metrics, enable diagnostics, grant access, or add a reporting endpoint for this purpose. An application's separately requested operational monitoring remains governed by its own requirements and approvals.

The tag is the primary attribution signal; name matching is only a secondary discovery aid. Metadata can indicate current resource footprint by recorded version and resource type, not active application usage, unique people, unique applications, or deployment-event counts. It cannot measure local-only usage or lifetime adoption. Tags may be edited, resources deleted, and templates copied; this is not tamper-resistant evidence.

This convention does not grant Microsoft additional access or send SQL Apps a usage report. Azure Resource Graph is limited to resources the querying principal can access. Any Microsoft-side reporting would require an independently approved metadata source; do not assume one exists or promise Microsoft-wide visibility.

## Official references

- [Azure tags: plaintext, inheritance, case semantics, limits, and support](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources).
- [Azure resource naming rules by provider](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules).
- [Azure Resource Graph overview and access requirements](https://learn.microsoft.com/en-us/azure/governance/resource-graph/overview).

# n8n-nodes-pdfsbuild

This is an n8n community node for [pdfs.build](https://pdfs.build). It lets you render PDFs from your pdfs.build templates inside n8n workflows.

pdfs.build is a PDF template engine: you design a template once, and it comes with a JSON schema that describes the data it needs. Your workflows then send JSON data to the pdfs.build API and get a finished PDF back.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Development](#development)
- [Resources](#resources)
- [Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. In short, on a self-hosted instance (owner or admin account):

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-pdfsbuild` as the npm package name.
4. Agree to the risks of installing unverified code and select **Install**.

The **pdfs.build** node then appears in the nodes panel. For queue mode or Docker images without GUI installs, use [manual installation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/manual-installation/) with `npm install n8n-nodes-pdfsbuild`.

## Credentials

The node authenticates with an organization-scoped pdfs.build API key. You need:

- A pdfs.build account at [app.pdfs.build](https://app.pdfs.build) on the Starter plan or higher. The Free plan has no REST API access, so it cannot create API keys.
- At least one **published** template. Drafts cannot be rendered over the API.

To set up the credential:

1. Sign in to [app.pdfs.build](https://app.pdfs.build) and open **Developers > API keys** in the sidebar.
2. Create a key and copy it. It starts with `prs_` and is shown only once.
3. Copy the **Organization ID** shown at the top of the same page.
4. In n8n, create a **pdfs.build API** credential and paste both values.

n8n tests the credential by listing your templates. If the organization ID does not belong to the key's organization, the test fails with `organization_scope_mismatch`.

## Operations

| Resource | Operation | What it does |
| --- | --- | --- |
| PDF | Render | Fill a published template with JSON data and return the PDF as binary data, or queue it as a background job |
| Render Job | Get | Get the status of a background render |
| Render Job | Download PDF | Download the PDF of a background render that has succeeded |
| Template | Get | Get a template's metadata, JSON schema and sample data |
| Template | Get Many | List the published templates in your organization |

Wherever the node asks for a template you can pick it from a searchable list or enter its template ID (the external ID you see in the app, for example `invoice-primary`). Both accept expressions.

### PDF > Render

Renders a published template with your data.

- **Template**: the template to render.
- **Data**: a JSON object whose keys match the template's schema. Use an expression such as `{{ $json }}` to pass the incoming item.
- **Run in Background**: off by default. When on, the render is queued and the node returns the job instead of the PDF.
- **Put Output File in Field**: the binary field that receives the PDF. Defaults to `data`.
- **Options > Version**: a version number (`4`), `draft` for the working copy, or a channel name such as `staging`. Empty uses the `latest` channel.
- **Options > Webhook Endpoint IDs**: comma-separated webhook endpoint IDs (`whe_...`) to notify about this render. Without this option every enabled endpoint is notified.

Example: with **Data** set to

```json
{
  "company": "Acme Corp",
  "items": [{ "name": "Consulting", "qty": 3, "price": 150 }],
  "due_date": "2026-06-01"
}
```

the node outputs one item with the PDF in the `data` binary field and this JSON:

```json
{ "fileName": "invoice.pdf", "fileSize": 48213 }
```

With **Run in Background** on, the output is the job handle instead:

```json
{
  "id": "job_7a1b9c2d",
  "status": "queued",
  "statusUrl": "https://api.pdfs.build/v2/organizations/<org>/renders/job_7a1b9c2d"
}
```

If the data does not match the schema, the node fails with `Validation failed` and lists each invalid field. If the template does not compile with that data, it fails with `Compilation failed` and the Typst diagnostics. Set **Settings > On Error** to **Continue (using error output)** to route these to an error branch instead.

### Render Job > Get

Returns the status of a background render. Set **Job ID** to the `id` from a background render, for example `{{ $json.id }}`.

```json
{
  "id": "job_7a1b9c2d",
  "status": "success",
  "templateExternalId": "invoice-primary",
  "durationMs": 812,
  "downloadUrl": "https://api.pdfs.build/v2/organizations/<org>/renders/job_7a1b9c2d/pdf",
  "createdAt": "2026-09-18T12:00:00.123456",
  "completedAt": "2026-09-18T12:00:01.020000"
}
```

`status` is one of `queued`, `processing`, `success` or `error`. When it is `error`, the `error` field says why.

### Render Job > Download PDF

Downloads the PDF of a succeeded background render into a binary field (default `data`). Set **Job ID** as above. The download must use the same API key that queued the job. While the job is still running the node fails with a `409` error saying the PDF is not available yet.

### Template > Get

Returns one template, including its `schema` (the JSON Schema your render data must satisfy) and `sampleData`. This is the quickest way to see which keys to send in **Data**.

```json
{
  "externalId": "invoice-primary",
  "name": "Invoice",
  "status": "published",
  "schema": { "type": "object", "properties": { "company": { "type": "string" } } },
  "sampleData": { "company": "Acme Corp" },
  "schemaLocked": false
}
```

### Template > Get Many

Returns one item per published template (`externalId`, `name`, `status`, timestamps). Turn on **Return All** or set a **Limit** (default 50).

## Example workflows

**Invoice by email.** A trigger (for example a Stripe or form trigger) feeds a **pdfs.build** node (PDF > Render, Data set to `{{ $json }}`), followed by a **Send Email** or **Gmail** node that attaches the binary field `data`.

**Large batches in the background.** **pdfs.build** (PDF > Render, Run in Background on) then **Wait** (a few seconds) then **pdfs.build** (Render Job > Get, Job ID `{{ $json.id }}`) then an **If** node on `{{ $json.status }}` equal to `success` then **pdfs.build** (Render Job > Download PDF). Loop the false branch back to the Wait node, or use the `render.completed` webhook with an n8n **Webhook** trigger instead of polling.

## Compatibility

- Requires n8n 1.85.0 or later.
- Tested against the n8n 2.x declarative routing engine.
- Built with `@n8n/node-cli` in strict mode, with no runtime dependencies.

## Development

```bash
npm install
npm run build
npm run lint
npm run dev   # starts n8n at http://localhost:5678 with this node loaded
```

Use Node.js 24, which `npm run dev` needs to run n8n. Node.js 22 can install, build and lint. On Node.js 25 `npm install` fails because `isolated-vm`, a dependency of `@n8n/node-cli`, does not compile.

## Resources

- [pdfs.build](https://pdfs.build)
- [pdfs.build docs](https://pdfs.build/docs/)
- [pdfs.build API reference](https://pdfs.build/docs/api/) and [OpenAPI spec](https://pdfs.build/openapi.json)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- Support: [hello@pdfs.build](mailto:hello@pdfs.build)

## Version history

### 0.1.0

Initial release: PDF > Render (with background mode), Render Job > Get and Download PDF, Template > Get and Get Many.

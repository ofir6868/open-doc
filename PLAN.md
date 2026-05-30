# open-doc — Architecture & Implementation Plan

> Self-hosted DOCX template automation platform.  
> Word stays the editor. open-doc makes it data-driven.

---

## 1. Project Identity

| Property | Value |
|---|---|
| Name | **open-doc** |
| License | MIT |
| Deployment | Self-hosted (Docker or bare Node) |
| Language | TypeScript throughout |
| Monorepo tool | **Nx** |
| Backend framework | **NestJS** |

---

## 2. Core Technical Decisions

### 2.1 Placeholder format — Content Controls (not raw text)

The platform uses **Word Content Controls** (`<w:sdt>` elements in OOXML) as the placeholder mechanism, not raw text like `{{client.firstName}}`.

**Why:**
- Content Controls are a first-class Word concept — they survive copy/paste, reformatting, and style changes
- Office.js has a clean API for inserting and querying them
- They can show placeholder text while remaining invisible in printed output
- The `<w:tag>` attribute is the machine-readable binding key (e.g. `client.firstName`)

**Generation flow:**  
Parse the DOCX ZIP → find `<w:sdt>` elements → read `<w:tag w:val="client.firstName"/>` → resolve `data.client.firstName` → replace `<w:sdtContent>` → rezip → return DOCX.

### 2.2 Template format — `.docx`

Templates are stored as `.docx`. For server-side generation `.docx` is simpler to read, manipulate, and return than `.dotx`. Users author in Word and upload via the web UI or API.

### 2.3 Backend — NestJS

NestJS provides a structured, module-based architecture with decorators, dependency injection, and class-based validation via `class-validator`. This maps cleanly to the service boundaries (Schema, Templates, Generation).

- **Modules:** `SchemaModule`, `TemplatesModule`, `GenerationModule`, `StorageModule`, `DocxModule`
- **Validation:** `class-validator` + `class-transformer` DTOs on every route
- **Config:** `@nestjs/config` + Joi schema validation at startup
- **File upload:** `@nestjs/platform-express` multer integration
- **Streaming response:** `StreamableFile` for binary DOCX output

### 2.4 Monorepo — Nx

Nx manages the workspace with:
- `apps/server` — NestJS backend
- `apps/addin` — React Word Add-in
- `apps/web` — React management dashboard
- `libs/shared` — shared TypeScript types (no runtime deps)

Nx handles build caching, affected-project detection, and consistent lint/test/build targets across all apps.

### 2.5 DOCX manipulation — direct XML (no wrapper library)

Libraries like `docxtemplater` work on text placeholders, not Content Controls. We parse DOCX directly:

- **`pizzip`** — ZIP read/write (synchronous, maintained fork of JSZip)
- **`fast-xml-parser`** — parse and serialize OOXML
- Pure functions: `readTemplate(buffer) → DocxDocument`, `renderTemplate(doc, data) → Buffer`

### 2.6 Word Add-in — React + Fluent UI v9

- **Office.js** for Word API access
- **Fluent UI v9** (Microsoft's design system) — fits Word's look natively
- **Vite** for bundling
- **office-addin-dev-certs** for local HTTPS (required by Office)
- XML manifest v1.1 — widest compatibility

### 2.7 Web UI — React + Vite

Minimal management dashboard: list/upload/delete templates, generate with a JSON editor, download output.

### 2.8 Schema — fetched from configured endpoint, with static fallback

```
SCHEMA_URL=https://your-crm.internal/api/schema
```

If `SCHEMA_URL` is unset, loads from `config/schema.json`. Schema is cached in memory with configurable TTL. Adapter interface supports custom fetchers.

### 2.9 Auth — none in MVP

API key support via `Authorization: Bearer` is designed in (guard exists, off by default). Assumed internal network deployment.

---

## 3. Repository Structure

```
open-doc/
├── apps/
│   ├── server/                        # NestJS backend
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── config/
│   │       │   └── config.module.ts   # @nestjs/config + Joi validation
│   │       ├── schema/
│   │       │   ├── schema.module.ts
│   │       │   ├── schema.controller.ts
│   │       │   └── schema.service.ts  # Fetch, cache, fallback to file
│   │       ├── templates/
│   │       │   ├── templates.module.ts
│   │       │   ├── templates.controller.ts
│   │       │   ├── templates.service.ts
│   │       │   └── dto/
│   │       │       └── upload-template.dto.ts
│   │       ├── generation/
│   │       │   ├── generation.module.ts
│   │       │   ├── generation.controller.ts
│   │       │   ├── generation.service.ts
│   │       │   └── dto/
│   │       │       └── generate.dto.ts
│   │       ├── storage/
│   │       │   ├── storage.module.ts
│   │       │   ├── storage.interface.ts      # IStorageAdapter
│   │       │   └── filesystem.storage.ts     # Default implementation
│   │       └── docx/
│   │           ├── docx.module.ts
│   │           ├── reader.ts                 # Parse DOCX, extract content controls
│   │           ├── renderer.ts               # Inject data, rezip
│   │           └── docx.types.ts
│   │
│   ├── addin/                         # Word Add-in (React + Office.js)
│   │   └── src/
│   │       ├── taskpane/
│   │       │   ├── index.tsx
│   │       │   ├── App.tsx
│   │       │   ├── components/
│   │       │   │   ├── SchemaTree.tsx        # Expandable field browser
│   │       │   │   ├── FieldNode.tsx         # Leaf with Insert button
│   │       │   │   ├── StatusBar.tsx         # Server connectivity indicator
│   │       │   │   └── Settings.tsx          # Server URL, persisted to localStorage
│   │       │   └── hooks/
│   │       │       ├── useSchema.ts          # Fetch /api/schema
│   │       │       └── useWord.ts            # Office.js helpers
│   │       └── manifest.xml
│   │
│   └── web/                           # Management dashboard (React)
│       └── src/
│           ├── pages/
│           │   ├── TemplateList.tsx          # Upload, list, delete
│           │   ├── Generate.tsx              # Template picker + JSON editor + download
│           │   └── Settings.tsx
│           ├── api/
│           │   └── client.ts                 # Typed fetch wrapper
│           └── App.tsx
│
├── libs/
│   └── shared/                        # Shared TypeScript types (zero runtime deps)
│       └── src/
│           ├── types.ts               # TemplateEntry, GenerateRequest, GenerateError
│           └── schema.ts             # SchemaDefinition, schema traversal helpers
│
├── templates/                         # Default template storage (gitignored except examples)
│   └── example-nda.docx
│
├── config/
│   └── schema.json                    # Fallback schema if SCHEMA_URL is unset
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## 4. API Surface

All routes under `/api`. JSON everywhere except `/api/generate` which streams a binary DOCX.

### 4.1 Health

```
GET /health
→ { status: "ok", version: "0.1.0" }
```

### 4.2 Schema

```
GET /api/schema
→ {
    "client": { "firstName": "string", "lastName": "string" },
    "case":   { "number": "string", "date": "string" }
  }
```

### 4.3 Templates

```
GET    /api/templates
→ [{ id, name, size, createdAt, fields[] }]

GET    /api/templates/:id
→ { id, name, size, createdAt, fields[] }

POST   /api/templates          multipart/form-data: file=<docx>
→ { id, name, fields[] }

DELETE /api/templates/:id
→ 204

GET    /api/templates/:id/download
→ application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

`fields[]` — the list of content control tags found in the file, e.g. `["client.firstName", "case.number"]`.

### 4.4 Generation

```
POST /api/generate
{
  "templateId": "employment",
  "data": {
    "client": { "firstName": "John", "lastName": "Doe" },
    "case":   { "number": "2024-001" }
  }
}
→ application/vnd.openxmlformats-officedocument.wordprocessingml.document
  Content-Disposition: attachment; filename="employment-generated.docx"
```

Missing fields render as empty strings. `strict: true` in the body returns 422 with a list of missing field paths.

---

## 5. NestJS Module Design

### AppModule imports

```
AppModule
├── ConfigModule        (global, Joi-validated env)
├── StorageModule       (global, provides IStorageAdapter)
├── DocxModule          (global, provides DocxReader + DocxRenderer)
├── SchemaModule        → GET /api/schema
├── TemplatesModule     → GET/POST/DELETE /api/templates
└── GenerationModule    → POST /api/generate
```

### GenerationService (core logic)

```typescript
@Injectable()
export class GenerationService {
  constructor(
    private readonly templates: TemplatesService,
    private readonly reader: DocxReader,
    private readonly renderer: DocxRenderer,
  ) {}

  async generate(dto: GenerateDto): Promise<Buffer> {
    const buffer = await this.templates.getRaw(dto.templateId)
    const doc = this.reader.read(buffer)
    return this.renderer.render(doc, dto.data, dto.strict)
  }
}
```

### GenerationController

```typescript
@Post('generate')
@Header('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
async generate(@Body() dto: GenerateDto, @Res() res: Response) {
  const buffer = await this.generationService.generate(dto)
  res.set('Content-Disposition', `attachment; filename="${dto.templateId}-generated.docx"`)
  res.end(buffer)
}
```

---

## 6. DOCX Engine — Internal Design

### Reading a template

```typescript
read(buffer: Buffer): DocxDocument
```

1. Unzip with `pizzip`
2. Parse `word/document.xml` with `fast-xml-parser`
3. Walk AST, collect all `<w:sdt>` nodes
4. Extract `<w:tag w:val>` from each — this is the field path
5. Return `{ zip, ast, contentControls: Array<{ tag, node }> }`

### Rendering

```typescript
render(doc: DocxDocument, data: Record<string, unknown>, strict?: boolean): Buffer
```

1. Deep-clone AST
2. For each `<w:sdt>`: resolve `_.get(data, tag) ?? ""`, replace `<w:sdtContent>`
3. If `strict` and any tag missing from data → throw with missing list
4. Serialize XML → write into zip → return Buffer

Pure functions. No side effects. Trivially unit-testable with fixture DOCX files.

### Content control structure in OOXML

```xml
<w:sdt>
  <w:sdtPr>
    <w:tag w:val="client.firstName"/>
    <w:alias w:val="First Name"/>
    <w:text/>
  </w:sdtPr>
  <w:sdtContent>
    <w:p><w:r><w:t>{{client.firstName}}</w:t></w:r></w:p>
  </w:sdtContent>
</w:sdt>
```

---

## 7. Word Add-in — Internal Design

### Field insertion via Office.js

```typescript
async function insertContentControl(fieldPath: string) {
  await Word.run(async (ctx) => {
    const cc = ctx.document.getSelection().insertContentControl()
    cc.tag = fieldPath
    cc.title = fieldPath
    cc.appearance = Word.ContentControlAppearance.tags
    cc.placeholderText.insertText(`{{${fieldPath}}}`, Word.InsertLocation.replace)
    await ctx.sync()
  })
}
```

### Schema tree UI

```
SchemaTree
└── SchemaNode (client)   [expandable]
    ├── FieldNode (firstName)  → [Insert]
    └── FieldNode (lastName)   → [Insert]
└── SchemaNode (case)     [expandable]
    └── FieldNode (number)     → [Insert]
```

### Settings persistence

Server URL and optional API key stored in `localStorage` within the Add-in iframe. On load: read settings → `GET /health` → show connected/disconnected status.

---

## 8. Storage Adapter

```typescript
export interface IStorageAdapter {
  list(): Promise<TemplateEntry[]>
  get(id: string): Promise<Buffer>
  save(id: string, buffer: Buffer): Promise<void>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
}
```

`FilesystemAdapter` is the default, backed by `TEMPLATE_DIR`. A future `S3Adapter` or `MinioAdapter` drops in with no service-layer changes.

---

## 9. Configuration (`.env.example`)

```bash
PORT=3000
HOST=0.0.0.0

TEMPLATE_DIR=./templates

SCHEMA_URL=https://your-crm.internal/api/schema
SCHEMA_CACHE_TTL=60        # seconds; 0 = no cache

API_KEY=                   # empty = auth disabled
STRICT_MODE=false          # true = error on missing fields

CORS_ORIGINS=*
```

All variables validated by Joi at startup — server refuses to start on invalid config.

---

## 10. Shared Types (`libs/shared`)

```typescript
export type FieldType = "string" | "number" | "date" | "boolean"
export type SchemaNode = FieldType | { [key: string]: SchemaNode }
export type SchemaDefinition = { [entity: string]: SchemaNode }

export interface TemplateEntry {
  id: string          // filename without extension
  name: string        // display name
  size: number        // bytes
  createdAt: string   // ISO 8601
  fields: string[]    // ["client.firstName", "case.number"]
}

export interface GenerateRequest {
  templateId: string
  data: Record<string, unknown>
  strict?: boolean
}

export interface GenerateError {
  error: string
  missing?: string[]  // fields bound in template but absent from data
}
```

---

## 11. Implementation Phases

### Phase 1 — Foundation
- Nx workspace init (`create-nx-workspace`)
- `libs/shared`: types, schema traversal helpers
- `apps/server`: NestJS scaffold, ConfigModule, health endpoint
- `apps/server`: StorageModule + FilesystemAdapter
- `apps/server`: TemplatesModule (CRUD routes, multer upload)
- `apps/server`: SchemaModule (HTTP fetch, file fallback, cache)

### Phase 2 — Generation Engine
- `apps/server/docx`: reader — unzip, parse XML, extract content controls
- `apps/server/docx`: renderer — inject data, rezip, strict mode
- `apps/server`: GenerationModule — wire services, StreamableFile response
- Unit tests for reader + renderer with real DOCX fixtures

### Phase 3 — Word Add-in
- Nx React app scaffold with Office.js + Fluent UI v9
- `manifest.xml` for local dev and production deployment
- Settings panel (server URL, connectivity test)
- SchemaTree component (fetch `/api/schema`, render expandable tree)
- `insertContentControl` via Office.js
- Dev docs: sideload add-in in Word

### Phase 4 — Web UI
- Nx React app scaffold
- TemplateList page (upload, delete, show discovered fields)
- Generate page (template picker, Monaco JSON editor, download)

### Phase 5 — OSS Polish
- Docker + docker-compose (server + web UI)
- Example templates (NDA, employment letter, invoice)
- Example `config/schema.json`
- `README.md` with quick-start, architecture diagram, add-in sideload guide
- `CONTRIBUTING.md`
- GitHub Actions: lint + test on PR

---

## 12. Key Dependencies

| Package | Purpose | License |
|---|---|---|
| `@nestjs/core`, `@nestjs/common` | Backend framework | MIT |
| `@nestjs/config` | Env config + validation | MIT |
| `@nestjs/platform-express` | HTTP adapter + multer | MIT |
| `class-validator`, `class-transformer` | DTO validation | MIT |
| `pizzip` | DOCX ZIP read/write | MIT |
| `fast-xml-parser` | OOXML parse/serialize | MIT |
| `lodash` | `_.get` for dot-path resolution | MIT |
| `joi` | Config schema validation | BSD-3 |
| `react` | Add-in and web UI | MIT |
| `@fluentui/react-components` | Fluent UI v9 | MIT |
| `@microsoft/office-js` | Word API | MS-RSLA (runs in user's Word, not redistributed) |
| `vite` | Bundler | MIT |
| `vitest` | Unit testing | MIT |
| `nx` | Monorepo tooling | MIT |

---

## 13. Getting Started (target README snippet)

```bash
# Clone
git clone https://github.com/your-org/open-doc.git && cd open-doc

# Configure
cp .env.example .env
# Edit: set SCHEMA_URL or use bundled example schema

# Run with Docker
docker compose up

# Server → http://localhost:3000
# Web UI → http://localhost:3001

# Sideload the Word Add-in
# See docs/addin-sideload.md
```

---

## 14. Open Questions / Future Work

| Topic | MVP | Future |
|---|---|---|
| Loops / table rows | ✗ | Repeating Section Content Controls |
| Conditional blocks | ✗ | Custom XML parts + post-processing |
| PDF output | ✗ | LibreOffice headless sidecar |
| E-signatures | ✗ | DocuSign / Adobe Sign API wrapper |
| S3 / MinIO storage | ✗ | `S3Adapter` implementing `IStorageAdapter` |
| Auth | API key (off by default) | OAuth2 / OIDC |
| Multi-tenancy | ✗ | Namespace templates by org ID |
| Version control | ✗ | Git-backed storage adapter |
| Audit log | ✗ | Structured log stream per generation |

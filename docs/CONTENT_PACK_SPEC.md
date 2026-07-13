# Content Pack Specification

Content packs keep reusable agent functions separate from project-owned material.

## Layout

```text
content-packs/<pack-id>/
  content-pack.json
  source/
  indexes/
  schemas/
```

The manifest must define `id`, `name`, `version`, `kind`, `visibility`, `canonMode`, `capabilities`, `imagePolicy` and `defaultWorkspace`.

## Distribution rules

- Public packs may include only material that is owned and redistributable.
- Private packs must stay in private storage and mount through an environment variable.
- Databases, caches, outputs, credentials and login state remain local.
- Browser references are links and fact cards unless redistribution rights are confirmed.
- Every imported asset should record one of: `owned-redistributable`, `owned-private`, `licensed-private`, `reference-only` or `private-review-required`.
- The default is `private-review-required`; nothing is uploaded automatically.

# Folio development

Fish is the product owner. Preserve the established paper/origami style and local user data. Keep Widget API v1 externally extensible. Read README.md and PROVENANCE.md before making release or license claims.

Do not commit credentials, signing keys, local account/cookie stores, personal screenshots or build artifacts. Use fake QA fixtures. School records are read-only; personal record mutations use a proposal confirmed by the user before persistence. Synthetic gestures and offline tests are not physical-device or real-SSO validation.

This public test repository was imported as a curated snapshot from sibling source directories. During the current local session the live preview still serves the originals. `python scripts/sync_workspace.py --source-parent ..` imports allowed source updates without deleting files; inspect Git diff before committing. Never sync backwards without first determining the active workspace. One writer at a time; avoid unnecessary agent calls.

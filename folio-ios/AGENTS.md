# Folio iOS validation

Read ../folio-android/AGENTS.md and TEAM-STATE.md first. One writer only.
This independent UIKit/WKWebView host reuses ../folio-prototype verbatim.
Do not rewrite, restyle or modify the established web/Android app for this experiment.
Generated/ is a disposable copy, never a second source of truth. Verify hashes.
Simulator fixture injection is DEBUG + simulator + explicit launch argument only.
No school credentials, provider keys, signing certificates or personal data in CI.
The user expanded this stage to native bridges and an unsigned arm64 device IPA.
Do not claim unsigned artifacts install directly or that TestFlight/signing has happened.
Keep real-device/SSO/provider testing distinct from isolated simulator fixtures.
Unimplemented native operations must fail honestly; never return fabricated success.

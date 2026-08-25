---
'datocms-structured-text-utils': patch
'datocms-structured-text-slate-utils': patch
---

Fix the `homepage` link, which pointed at a directory that does not exist and so returned a 404 from the package's page on npm. It now points at the package's actual folder in the repository.

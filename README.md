# 🩺 env-doctor

**Environment Configuration Doctor, Schema Validator & Secret Leak Auditor**

`env-doctor` stops runtime crashes caused by missing environment variables and prevents accidental secret leaks before code is pushed to Git.

---

## ✨ Key Features

- 🔍 **Schema & Diff Validation:** Compares `.env` against `.env.example` to detect missing, extra, or unpopulated variables.
- 🛡️ **Entropy & Secret Scanning:** Heuristic detection of committed production secrets, private keys, and high-entropy credentials.
- ⚡ **Zero-Dependency CLI:** Instant execution with `npx env-doctor`.
- 🪝 **Pre-Commit Hook Integration:** Easily drop into Git hooks or CI pipelines.
- 🛠️ **Auto-Sync Mode:** Interactively generate missing `.env` keys from `.env.example`.

---

## 🚀 Quickstart

### Run via npx

```bash
npx env-doctor check
```

### Auto-fix and generate missing keys

```bash
npx env-doctor sync
```

---

## 📄 License

MIT License.

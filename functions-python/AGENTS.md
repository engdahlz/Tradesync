# BACKEND KNOWLEDGE BASE (PYTHON)

**Context:** functions-python/
**Generated:** Wed Jan 21 2026

## OVERVIEW
Python-based Cloud Functions service handling **Avanza integration** and specific trading logic requiring Python libraries.

## STRUCTURE
```
functions-python/
├── main.py             # Entry point (Cloud Functions)
├── avanza_service.py   # Avanza API logic
├── DEPLOY_INSTRUCTIONS.md # Deployment guide
└── requirements.txt    # Python dependencies
```

## CONVENTIONS
- **Runtime**: Python 3.11
- **Dependencies**: Managed via `requirements.txt` / `venv`.
- **Type Safety**: Use `pydantic` for data models where possible.

## ANTI-PATTERNS
- ❌ **Complex State**: Keep functions stateless.
- ❌ **Hardcoded Creds**: Use environment variables / Secret Manager.

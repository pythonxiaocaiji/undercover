# Backend (FastAPI)

## Start

1. Create env

Copy `.env.example` to `.env` and edit.

2. Install

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

3. Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

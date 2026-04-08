.PHONY: run dev test smoke install

install:
	uv sync
	cd frontend && npm install

run:
	uv run uvicorn signsafe.main:app --host 0.0.0.0 --port 8894 --reload

dev:
	./start.sh

test:
	uv run pytest -v

smoke:
	uv run python smoke_test.py

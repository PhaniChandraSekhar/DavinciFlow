.PHONY: up down build logs migrate shell-backend shell-frontend test clean

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

migrate:
	docker compose exec backend alembic upgrade head

shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

test:
	docker compose exec backend pytest

clean:
	docker compose down -v

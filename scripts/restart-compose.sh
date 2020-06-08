#!/usr/bin/env bash
set -e
COMPOSE_PROJECT_NAME=local docker-compose down --remove-orphans
COMPOSE_PROJECT_NAME=local docker-compose up -d

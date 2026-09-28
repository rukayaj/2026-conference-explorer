#!/usr/bin/env bash
# Pin an image in ../gitops and roll it out on NIRD (same flow as chatipt).
# By default it deploys the image GitHub Actions built for the current commit; --build-local builds and pushes it here instead.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GITOPS_DIR="${GITOPS_DIR:-$ROOT_DIR/../gitops}"
MANIFEST_DIR="${MANIFEST_DIR:-$GITOPS_DIR/apps/tdwg2026/templates}"
KUBE_CONTEXT="${KUBE_CONTEXT:-nird-lmd}"
KUBE_NAMESPACE="${KUBE_NAMESPACE:-gbif-no-ns8095k}"
IMAGE_REPO="${IMAGE_REPO:-gbifnorway/tdwg2026}"
BUILD_PLATFORM="${BUILD_PLATFORM:-linux/amd64}"

tag=""
build_local=false
skip_gitops_commit=false
skip_apply=false
while [ $# -gt 0 ]; do
  case "$1" in
    --tag) tag="$2"; shift ;;
    --build-local) build_local=true ;;
    --skip-gitops-commit) skip_gitops_commit=true ;;
    --skip-apply) skip_apply=true ;;
    -h|--help) echo "Usage: $0 [--tag TAG] [--build-local] [--skip-gitops-commit] [--skip-apply]"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

log() { printf '\n[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

[ -d "$MANIFEST_DIR" ] || { echo "Manifests not found: $MANIFEST_DIR" >&2; exit 1; }

if [ "$build_local" = true ]; then
  docker info >/dev/null 2>&1 || { echo "Docker is not running." >&2; exit 1; }
  if [ -n "$(git -C "$ROOT_DIR" status --porcelain -- src server scripts public package.json package-lock.json Dockerfile)" ]; then
    echo "Commit your changes first so the image tag matches the code." >&2
    exit 1
  fi
  tag="${tag:-$(git -C "$ROOT_DIR" rev-parse --short=7 HEAD)-local}"
  log "Building and pushing ${IMAGE_REPO}:${tag}"
  docker buildx build --platform "$BUILD_PLATFORM" -t "${IMAGE_REPO}:${tag}" -t "${IMAGE_REPO}:latest" \
    --provenance=false --sbom=false --push "$ROOT_DIR"
else
  tag="${tag:-$(git -C "$ROOT_DIR" rev-parse --short=7 HEAD)}"
  log "Waiting for GitHub Actions to publish ${IMAGE_REPO}:${tag}"
  for _ in $(seq 1 60); do
    docker manifest inspect "${IMAGE_REPO}:${tag}" >/dev/null 2>&1 && break
    sleep 15
  done
  docker manifest inspect "${IMAGE_REPO}:${tag}" >/dev/null 2>&1 || {
    echo "No ${IMAGE_REPO}:${tag} after 15 minutes. Has the commit been pushed, and did it change anything the image is built from? Use --tag to deploy an existing image." >&2
    exit 1
  }
fi

log "Pinning ${IMAGE_REPO}:${tag} in gitops"
perl -i -pe "s|image: \Q${IMAGE_REPO}\E:.*|image: ${IMAGE_REPO}:${tag}|" "$MANIFEST_DIR/deployment.yaml"
grep -n "image:" "$MANIFEST_DIR/deployment.yaml"

if [ "$skip_gitops_commit" = false ]; then
  git -C "$GITOPS_DIR" add "$MANIFEST_DIR/.."
  git -C "$GITOPS_DIR" commit -m "tdwg2026: deploy image ${tag}"
  git -C "$GITOPS_DIR" push
fi

if [ "$skip_apply" = false ]; then
  log "Applying manifests"
  kubectl --context "$KUBE_CONTEXT" -n "$KUBE_NAMESPACE" apply -f "$MANIFEST_DIR"
  kubectl --context "$KUBE_CONTEXT" -n "$KUBE_NAMESPACE" rollout status deploy/tdwg2026 --timeout=300s
fi

log "Done: ${IMAGE_REPO}:${tag}"

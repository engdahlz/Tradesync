"""Runtime environment normalization for Google GenAI/Vertex."""

from __future__ import annotations

import os


def configure_genai_env() -> None:
    """Ensure google-genai sees the right auth config in serverless envs."""
    # Prefer the standard google-genai env var if only legacy key is set.
    if not os.getenv("GOOGLE_API_KEY"):
        legacy_key = os.getenv("GOOGLE_AI_API_KEY")
        if legacy_key:
            os.environ["GOOGLE_API_KEY"] = legacy_key

    # If Vertex is intended, make sure the required env vars are present.
    if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "").lower() == "true":
        project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT") or os.getenv("GCP_PROJECT")
        location = (
            os.getenv("GOOGLE_CLOUD_LOCATION")
            or os.getenv("GOOGLE_CLOUD_REGION")
            or os.getenv("FUNCTIONS_REGION")
            or os.getenv("GCLOUD_REGION")
            or os.getenv("GCP_REGION")
            or "global"
        )
        if project:
            os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project)
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", location)
        return

    # Otherwise, default to Vertex when a project is available and no API key is set.
    if os.getenv("GOOGLE_API_KEY"):
        return

    project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT") or os.getenv("GCP_PROJECT")
    location = (
        os.getenv("GOOGLE_CLOUD_LOCATION")
        or os.getenv("GOOGLE_CLOUD_REGION")
        or os.getenv("FUNCTIONS_REGION")
        or os.getenv("GCLOUD_REGION")
        or os.getenv("GCP_REGION")
        or "global"
    )
    if project:
        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project)
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", location)

"""
Gemini API integration for plain-text environmental anomaly summaries.
Falls back to a rule-based summary if the API key is not configured.
"""
from __future__ import annotations
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def _rule_based_summary(analysis_type: str, stats: dict, anomalies: list) -> str:
    """Deterministic fallback summary when Gemini is not configured."""
    n = len(anomalies)
    severity_words = {True: "high", False: "moderate"}
    high_sev = any(a.get("severity", 0) > 3.5 for a in anomalies)

    type_context = {
        "sar_backscatter": "SAR radar backscatter analysis",
        "optical_ndvi": "vegetation index (NDVI) analysis",
        "change_detection": "temporal change detection",
        "anomaly_detection": "environmental anomaly detection",
        "elevation_model": "digital elevation model analysis",
    }.get(analysis_type, "geospatial analysis")

    if n == 0:
        return (
            f"The {type_context} completed successfully with no significant anomalies detected. "
            f"The scene appears stable with uniform spatial characteristics across the region of interest."
        )

    severity_str = severity_words[high_sev]
    summary = (
        f"The {type_context} identified {n} anomalous region{'s' if n > 1 else ''} "
        f"with {severity_str} severity scores. "
    )

    if analysis_type == "optical_ndvi":
        veg = stats.get("vegetation_pct", 0)
        urban = stats.get("urban_bare_pct", 0)
        summary += (
            f"Vegetation covers approximately {veg:.1f}% of the scene, "
            f"while urban or bare surfaces account for {urban:.1f}%. "
        )
        if high_sev:
            summary += (
                "The anomalous patches may indicate deforestation, crop stress, "
                "or burn scars requiring follow-up optical or field verification."
            )

    elif analysis_type == "sar_backscatter":
        dr = stats.get("dynamic_range_db", 0)
        summary += (
            f"Radar dynamic range measures {dr:.1f} dB. "
        )
        if high_sev:
            summary += (
                "High-backscatter anomalies are consistent with surface roughness changes "
                "such as lava flows, landslides, or emerging infrastructure."
            )

    elif analysis_type == "change_detection":
        chg = stats.get("changed_pixels_pct", 0)
        summary += (
            f"Approximately {chg:.2f}% of the scene shows statistically significant change. "
        )
        if high_sev:
            summary += (
                "The magnitude and spatial pattern of change may indicate a rapid geomorphological "
                "event or large-scale land-use modification."
            )

    else:
        if high_sev:
            summary += (
                "Anomalies exhibit elevated deviation from background statistics, "
                "suggesting a localized environmental disturbance or data artifact requiring expert review."
            )

    return summary


async def generate_analysis_summary(
    analysis_type: str,
    stats: dict,
    anomalies: list,
    region_name: Optional[str] = None,
) -> str:
    """
    Generate an AI summary using Gemini 1.5 Flash.
    Returns rule-based fallback if GEMINI_API_KEY is absent.
    """
    if not settings.GEMINI_API_KEY:
        return _rule_based_summary(analysis_type, stats, anomalies)

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        region_str = f" over the region '{region_name}'" if region_name else ""
        prompt = (
            f"You are an expert remote sensing analyst. "
            f"A {analysis_type.replace('_', ' ')} was performed{region_str}. "
            f"Statistics: {stats}. "
            f"Top anomalies detected (up to 5): {anomalies[:5]}. "
            f"Write a concise 2-4 sentence plain-English summary of the environmental findings, "
            f"potential causes, and recommended follow-up actions. "
            f"Do not use bullet points or markdown."
        )

        response = await model.generate_content_async(prompt)
        return response.text.strip()

    except Exception as exc:
        logger.warning("Gemini API call failed, falling back to rule-based summary: %s", exc)
        return _rule_based_summary(analysis_type, stats, anomalies)

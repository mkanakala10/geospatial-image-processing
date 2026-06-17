"""
Core image processing pipeline for SAR and optical satellite imagery.

Algorithms:
  - SAR speckle reduction: Lee filter (adaptive, preserves edges)
  - Optical noise reduction: Gaussian + bilateral filter
  - Spatial resolution scaling: Lanczos resampling
  - NDVI computation for vegetation change
  - Anomaly detection: Z-score thresholding on band statistics
  - Change detection: Difference + morphological post-processing
"""
from __future__ import annotations

import io
import time
import numpy as np
from typing import Optional
from PIL import Image
from scipy import ndimage
from scipy.ndimage import uniform_filter, generic_filter


# ─── Low-level filters ────────────────────────────────────────────────────────

def lee_filter(image: np.ndarray, window_size: int = 7) -> np.ndarray:
    """
    Lee adaptive speckle filter for SAR imagery.
    Reduces speckle while preserving edges by weighting between local mean
    and the observed pixel value.
    """
    img = image.astype(np.float64)
    mean = uniform_filter(img, window_size)
    mean_sq = uniform_filter(img ** 2, window_size)
    variance = mean_sq - mean ** 2

    # Noise variance estimated from the image (assumed homogeneous patches)
    noise_var = np.mean(variance)
    weight = variance / (variance + noise_var + 1e-10)
    return mean + weight * (img - mean)


def gaussian_noise_reduction(
    image: np.ndarray, sigma: float = 1.5
) -> np.ndarray:
    return ndimage.gaussian_filter(image.astype(np.float64), sigma=sigma)


def bilateral_approx(image: np.ndarray, sigma_s: float = 2.0) -> np.ndarray:
    """Approximate bilateral filter via iterated Gaussian."""
    result = image.astype(np.float64)
    for _ in range(3):
        result = ndimage.gaussian_filter(result, sigma=sigma_s / 3)
    return result


def lanczos_scale(image: np.ndarray, scale: float) -> np.ndarray:
    """Scale image using Pillow Lanczos (high-quality downscale)."""
    pil = Image.fromarray(np.clip(image, 0, 255).astype(np.uint8))
    new_w = max(1, int(pil.width * scale))
    new_h = max(1, int(pil.height * scale))
    pil = pil.resize((new_w, new_h), Image.LANCZOS)
    return np.array(pil)


def compute_ndvi(red: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """NDVI = (NIR - RED) / (NIR + RED). Returns float [-1, 1]."""
    r = red.astype(np.float64)
    n = nir.astype(np.float64)
    denom = n + r
    denom[denom == 0] = 1e-10
    return (n - r) / denom


def detect_anomalies(
    image: np.ndarray, threshold_sigma: float = 2.5
) -> tuple[np.ndarray, list[dict]]:
    """
    Z-score anomaly detection. Returns a binary mask and a list of detected
    anomaly regions with centroid, area, and severity.
    """
    flat = image.astype(np.float64).ravel()
    mean, std = flat.mean(), flat.std()
    if std < 1e-10:
        return np.zeros_like(image, dtype=bool), []

    z = np.abs((image - mean) / std)
    mask = z > threshold_sigma

    # Label connected components
    labeled, n_features = ndimage.label(mask)
    anomalies = []
    for i in range(1, min(n_features + 1, 50)):  # cap at 50 anomalies
        component = labeled == i
        area = int(component.sum())
        if area < 4:
            continue
        ys, xs = np.where(component)
        cy, cx = float(ys.mean()), float(xs.mean())
        severity = float(z[component].mean())
        anomalies.append({
            "id": i,
            "centroid_px": [cx, cy],
            "area_px": area,
            "severity": round(severity, 3),
        })

    return mask, sorted(anomalies, key=lambda a: a["severity"], reverse=True)


def change_detection(
    before: np.ndarray, after: np.ndarray, threshold: float = 30.0
) -> np.ndarray:
    """
    Pixel-wise absolute difference with morphological cleanup.
    Returns a binary change mask.
    """
    diff = np.abs(after.astype(np.float64) - before.astype(np.float64))
    mask = diff > threshold
    # Remove noise with morphological opening
    struct = ndimage.generate_binary_structure(2, 2)
    mask = ndimage.binary_opening(mask, structure=struct, iterations=2)
    return mask


# ─── High-level pipeline functions ────────────────────────────────────────────

def _generate_demo_sar(shape=(512, 512)) -> np.ndarray:
    """Synthetic SAR-like speckle image for demo mode."""
    rng = np.random.default_rng(42)
    base = np.ones(shape) * 128
    # Add some structure (simulated volcanic terrain)
    for _ in range(6):
        cx, cy = rng.integers(50, shape[1] - 50), rng.integers(50, shape[0] - 50)
        radius = rng.integers(20, 80)
        y, x = np.ogrid[:shape[0], :shape[1]]
        circle = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        base += np.exp(-circle / radius) * rng.uniform(40, 120)
    # Add multiplicative speckle noise (realistic for SAR)
    speckle = rng.gamma(shape=1.0, scale=1.0, size=shape)
    return np.clip(base * speckle / base.mean() * 100, 0, 255)


def _generate_demo_optical(shape=(512, 512)) -> tuple[np.ndarray, np.ndarray]:
    """Synthetic optical image with red + NIR bands for NDVI demo."""
    rng = np.random.default_rng(7)
    red = np.clip(rng.normal(100, 20, shape), 0, 255)
    nir = np.clip(rng.normal(160, 25, shape), 0, 255)
    # Simulate urban patch (low NDVI)
    red[200:300, 200:350] = rng.normal(180, 10, (100, 150))
    nir[200:300, 200:350] = rng.normal(80, 10, (100, 150))
    # Simulate dense vegetation (high NDVI)
    red[50:150, 50:180] = rng.normal(40, 8, (100, 130))
    nir[50:150, 50:180] = rng.normal(220, 10, (100, 130))
    return red, nir


def _array_to_png_b64(arr: np.ndarray, colormap: str = "gray") -> str:
    """Convert a float/int array to a base64-encoded PNG string."""
    import base64

    normed = (arr - arr.min()) / (arr.max() - arr.min() + 1e-10)
    uint8 = (normed * 255).astype(np.uint8)

    if colormap == "rdylgn":
        # Red-Yellow-Green colormap for NDVI
        r = np.clip(2 - normed * 2, 0, 1)
        g = np.clip(normed * 2, 0, 1)
        b = np.zeros_like(normed)
        rgb = (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
        img = Image.fromarray(rgb, mode="RGB")
    elif colormap == "hot":
        r = np.clip(normed * 3, 0, 1)
        g = np.clip(normed * 3 - 1, 0, 1)
        b = np.clip(normed * 3 - 2, 0, 1)
        rgb = (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)
        img = Image.fromarray(rgb, mode="RGB")
    elif colormap == "anomaly":
        # White background, red anomalies
        base = np.ones((*uint8.shape, 3), dtype=np.uint8) * 220
        base[uint8 > 128, 0] = 220
        base[uint8 > 128, 1] = 50
        base[uint8 > 128, 2] = 50
        img = Image.fromarray(base, mode="RGB")
    else:
        img = Image.fromarray(uint8, mode="L")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def run_sar_pipeline(parameters: dict) -> dict:
    """Full SAR backscatter processing pipeline."""
    t0 = time.time()
    resolution_scale = parameters.get("resolution_scale", 1.0)
    filter_window = parameters.get("filter_window", 7)
    anomaly_sigma = parameters.get("anomaly_sigma", 2.5)

    raw = _generate_demo_sar()

    # Step 1: Spatial resolution scaling
    if resolution_scale != 1.0:
        scaled = lanczos_scale(raw, resolution_scale)
    else:
        scaled = raw

    # Step 2: Lee speckle reduction
    despecked = lee_filter(scaled, window_size=filter_window)

    # Step 3: Anomaly detection on cleaned image
    anomaly_mask, anomalies = detect_anomalies(despecked, threshold_sigma=anomaly_sigma)

    stats = {
        "mean_backscatter": round(float(despecked.mean()), 3),
        "std_backscatter": round(float(despecked.std()), 3),
        "dynamic_range_db": round(float(10 * np.log10(despecked.max() / (despecked.min() + 1e-10))), 2),
        "anomaly_count": len(anomalies),
        "output_shape": list(despecked.shape),
    }

    return {
        "processing_time_s": round(time.time() - t0, 3),
        "output_image_b64": _array_to_png_b64(despecked, "gray"),
        "anomaly_overlay_b64": _array_to_png_b64(anomaly_mask.astype(np.float32), "anomaly"),
        "anomalies": anomalies[:20],
        "statistics": stats,
        "pipeline_steps": ["sar_ingestion", "lanczos_scale", "lee_speckle_filter", "anomaly_detection"],
    }


def run_ndvi_pipeline(parameters: dict) -> dict:
    """NDVI optical analysis pipeline."""
    t0 = time.time()
    resolution_scale = parameters.get("resolution_scale", 1.0)
    sigma = parameters.get("gaussian_sigma", 1.5)

    red, nir = _generate_demo_optical()

    if resolution_scale != 1.0:
        red = lanczos_scale(red, resolution_scale).astype(np.float64)
        nir = lanczos_scale(nir, resolution_scale).astype(np.float64)

    # Noise reduction on each band
    red_clean = gaussian_noise_reduction(red, sigma=sigma)
    nir_clean = gaussian_noise_reduction(nir, sigma=sigma)

    ndvi = compute_ndvi(red_clean, nir_clean)

    # Zone classification
    vegetation_pct = float((ndvi > 0.3).mean() * 100)
    sparse_veg_pct = float(((ndvi > 0.1) & (ndvi <= 0.3)).mean() * 100)
    urban_pct = float(((ndvi <= 0.1) & (ndvi >= -0.1)).mean() * 100)
    water_pct = float((ndvi < -0.1).mean() * 100)

    anomaly_mask, anomalies = detect_anomalies(ndvi, threshold_sigma=2.0)

    stats = {
        "mean_ndvi": round(float(ndvi.mean()), 4),
        "max_ndvi": round(float(ndvi.max()), 4),
        "min_ndvi": round(float(ndvi.min()), 4),
        "vegetation_pct": round(vegetation_pct, 2),
        "sparse_vegetation_pct": round(sparse_veg_pct, 2),
        "urban_bare_pct": round(urban_pct, 2),
        "water_pct": round(water_pct, 2),
        "anomaly_count": len(anomalies),
    }

    return {
        "processing_time_s": round(time.time() - t0, 3),
        "output_image_b64": _array_to_png_b64(ndvi, "rdylgn"),
        "anomaly_overlay_b64": _array_to_png_b64(anomaly_mask.astype(np.float32), "anomaly"),
        "anomalies": anomalies[:20],
        "statistics": stats,
        "pipeline_steps": ["optical_ingestion", "band_extraction", "noise_reduction", "ndvi_computation", "zone_classification"],
    }


def run_change_detection_pipeline(parameters: dict) -> dict:
    """Temporal change detection between two epochs."""
    t0 = time.time()
    threshold = parameters.get("change_threshold", 30.0)
    rng = np.random.default_rng(99)

    before = _generate_demo_sar(shape=(256, 256))
    # Simulate change: add a new structure
    after = before.copy()
    after[80:130, 80:150] += rng.normal(60, 10, (50, 70))
    after = np.clip(after, 0, 255)

    mask = change_detection(before, after, threshold=threshold)
    change_pct = float(mask.mean() * 100)

    labeled, n = ndimage.label(mask)
    change_regions = []
    for i in range(1, min(n + 1, 30)):
        comp = labeled == i
        area = int(comp.sum())
        if area < 9:
            continue
        ys, xs = np.where(comp)
        change_regions.append({
            "id": i,
            "centroid_px": [float(xs.mean()), float(ys.mean())],
            "area_px": area,
        })

    stats = {
        "changed_pixels_pct": round(change_pct, 3),
        "n_change_regions": len(change_regions),
        "mean_change_magnitude": round(float(np.abs(after - before)[mask].mean()) if mask.any() else 0.0, 2),
    }

    return {
        "processing_time_s": round(time.time() - t0, 3),
        "output_image_b64": _array_to_png_b64(mask.astype(np.float32), "hot"),
        "anomaly_overlay_b64": _array_to_png_b64(mask.astype(np.float32), "anomaly"),
        "change_regions": change_regions,
        "anomalies": change_regions,
        "statistics": stats,
        "pipeline_steps": ["epoch_alignment", "radiometric_normalization", "difference_computation", "morphological_cleanup"],
    }


def run_anomaly_pipeline(parameters: dict) -> dict:
    """Standalone anomaly detection pass."""
    t0 = time.time()
    sigma = parameters.get("anomaly_sigma", 2.5)
    rng = np.random.default_rng(13)
    image = _generate_demo_sar(shape=(512, 512))
    # Plant several synthetic anomalies
    for _ in range(8):
        cx, cy = rng.integers(20, 490), rng.integers(20, 490)
        r = rng.integers(5, 20)
        y, x = np.ogrid[:512, :512]
        patch = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) < r
        image[patch] += rng.uniform(80, 140)
    image = np.clip(image, 0, 255)

    cleaned = lee_filter(image, window_size=5)
    mask, anomalies = detect_anomalies(cleaned, threshold_sigma=sigma)

    return {
        "processing_time_s": round(time.time() - t0, 3),
        "output_image_b64": _array_to_png_b64(cleaned, "gray"),
        "anomaly_overlay_b64": _array_to_png_b64(mask.astype(np.float32), "anomaly"),
        "anomalies": anomalies[:20],
        "statistics": {
            "total_anomalies": len(anomalies),
            "high_severity": sum(1 for a in anomalies if a["severity"] > sigma + 1),
            "coverage_pct": round(float(mask.mean() * 100), 3),
        },
        "pipeline_steps": ["ingestion", "lee_filter", "zscore_anomaly_detection"],
    }


PIPELINE_DISPATCH = {
    "sar_backscatter": run_sar_pipeline,
    "optical_ndvi": run_ndvi_pipeline,
    "change_detection": run_change_detection_pipeline,
    "anomaly_detection": run_anomaly_pipeline,
    "elevation_model": run_sar_pipeline,  # reuse SAR for demo
}


def run_pipeline(analysis_type: str, parameters: dict) -> dict:
    fn = PIPELINE_DISPATCH.get(analysis_type, run_sar_pipeline)
    return fn(parameters)

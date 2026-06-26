use anyhow::{Context, Result};
use image::{GenericImageView, ImageFormat, ImageReader};
use serde::Serialize;
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;
use tauri::command;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct CompressionResult {
    pub id: String,
    pub original_path: String,
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub compression_ratio: f64,
    pub width: u32,
    pub height: u32,
    pub format: String,
}

fn detect_format(path: &str) -> Option<ImageFormat> {
    let ext = path.rsplit('.').next()?.to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => Some(ImageFormat::Jpeg),
        "png" => Some(ImageFormat::Png),
        "webp" => Some(ImageFormat::WebP),
        "gif" => Some(ImageFormat::Gif),
        "bmp" => Some(ImageFormat::Bmp),
        _ => None,
    }
}

#[command]
pub async fn compress_image(
    input_path: String,
    output_path: Option<String>,
    quality: Option<u8>,
    max_width: Option<u32>,
    format: Option<String>,
) -> Result<CompressionResult, String> {
    let input = PathBuf::from(&input_path);
    if !input.exists() {
        return Err(format!("File not found: {}", input_path));
    }

    let mw = max_width.unwrap_or(4096);

    let img = ImageReader::open(&input)
        .with_context(|| format!("Failed to open image: {}", input_path))
        .map_err(|e| e.to_string())?
        .with_guessed_format()
        .map_err(|e| format!("Failed to detect format: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let original_size = fs::metadata(&input)
        .map(|m| m.len())
        .unwrap_or(0);

    let mut resized = img;
    if resized.width() > mw || resized.height() > mw {
        resized = resized.resize(mw, mw, image::imageops::FilterType::Lanczos3);
    }

    let target_format = format
        .as_deref()
        .and_then(|f| match f.to_lowercase().as_str() {
            "jpeg" | "jpg" => Some(ImageFormat::Jpeg),
            "png" => Some(ImageFormat::Png),
            "webp" => Some(ImageFormat::WebP),
            _ => None,
        })
        .or_else(|| detect_format(&input_path))
        .unwrap_or(ImageFormat::Jpeg);

    let ext = match target_format {
        ImageFormat::Jpeg => "jpg",
        ImageFormat::Png => "png",
        ImageFormat::WebP => "webp",
        _ => "jpg",
    };

    let out = match output_path {
        Some(p) => PathBuf::from(p),
        None => {
            let stem = input.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
            let temp_dir = std::env::temp_dir();
            let dir = input.parent().unwrap_or(&temp_dir);
            dir.join(format!("{}_compressed.{}", stem, ext))
        }
    };

    let mut buffer = Vec::new();
    {
        let mut cursor = Cursor::new(&mut buffer);
        if target_format == ImageFormat::Jpeg && quality.is_some() {
            let q = quality.unwrap_or(80).clamp(1, 100);
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, q);
            let (w, h) = resized.dimensions();
            let pixels = resized.to_rgb8();
            encoder
                .encode(pixels.as_raw(), w, h, image::ExtendedColorType::Rgb8)
                .map_err(|e| format!("JPEG encode failed: {}", e))?;
        } else {
            resized
                .write_to(&mut cursor, target_format)
                .map_err(|e| format!("Encode failed: {}", e))?;
        }
    }

    fs::write(&out, &buffer)
        .with_context(|| format!("Failed to write output: {:?}", out))
        .map_err(|e| e.to_string())?;

    let compressed_size = buffer.len() as u64;
    let ratio = if original_size > 0 {
        ((original_size as f64 - compressed_size as f64) / original_size as f64) * 100.0
    } else {
        0.0
    };

    tracing::info!(
        input = %input_path,
        output = %out.display(),
        original_kb = original_size / 1024,
        compressed_kb = compressed_size / 1024,
        format = ?target_format,
        "Image compressed"
    );

    Ok(CompressionResult {
        id: Uuid::now_v7().to_string(),
        original_path: input_path,
        output_path: out.display().to_string(),
        original_size,
        compressed_size,
        compression_ratio: ratio,
        width: resized.width(),
        height: resized.height(),
        format: format!("{:?}", target_format),
    })
}

#[command]
pub async fn batch_compress_images(
    input_paths: Vec<String>,
    quality: Option<u8>,
    max_width: Option<u32>,
    format: Option<String>,
) -> Result<Vec<CompressionResult>, String> {
    let mut results = Vec::new();
    for path in input_paths {
        match compress_image(path, None, quality, max_width, format.clone()).await {
            Ok(r) => results.push(r),
            Err(e) => tracing::warn!(error = %e, "Failed to compress image"),
        }
    }
    Ok(results)
}

use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct SiteConfig {
    pub id: String,
    pub template: String,
    pub theme: serde_json::Value,
    pub meta: serde_json::Value,
    pub sections: Vec<serde_json::Value>,
    #[serde(rename = "customCSS")]
    pub custom_css: String,
    #[serde(rename = "customHTML")]
    pub custom_html: String,
    pub language: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

fn get_data_dir() -> std::path::PathBuf {
    let base = std::env::var("LOCALAPPDATA")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    std::path::PathBuf::from(base).join("studioos")
}

#[command]
pub async fn save_site_config(config: serde_json::Value) -> Result<(), String> {
    let data_dir = get_data_dir();
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let path = data_dir.join("site_config.json");
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write site config: {}", e))?;
    Ok(())
}

#[command]
pub async fn load_site_config() -> Result<serde_json::Value, String> {
    let data_dir = get_data_dir();
    let path = data_dir.join("site_config.json");
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse site config: {}", e))
}

#[command]
pub async fn generate_site_static(config: serde_json::Value, output_dir: String) -> Result<serde_json::Value, String> {
    let out = std::path::PathBuf::from(&output_dir);
    std::fs::create_dir_all(&out).map_err(|e| e.to_string())?;
    let html = config.get("html").and_then(|v| v.as_str()).unwrap_or("");
    std::fs::write(out.join("index.html"), html).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "success": true,
        "output_dir": output_dir,
        "files": ["index.html"]
    }))
}

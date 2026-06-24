use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedState {
    pub version: u32,
    pub updated_at: DateTime<Utc>,
    pub art_items: Vec<PortfolioItem>,
    pub video_items: Vec<PortfolioItem>,
    pub nsfw_items: Vec<PortfolioItem>,
    pub hero_bg_images: Vec<PortfolioItem>,
    pub social_items: Vec<PortfolioItem>,
    pub queue_items: Vec<QueueItem>,
    pub system_state: SystemState,
    pub active_category: String,
    pub active_view: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortfolioItem {
    pub id: String,
    pub index: usize,
    pub r#type: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon_color: Option<String>,
    pub double: Option<bool>,
    pub vertical: Option<bool>,
    pub media_url: Option<String>,
    pub platform: Option<String>,
    pub url: Option<String>,
    pub nsfw: Option<bool>,
    pub pricing_tier: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueItem {
    pub id: String,
    pub req_id: String,
    pub client: String,
    pub r#type: String,
    pub status: String,
    pub priority: String,
    pub progress: u32,
    pub stage_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemState {
    pub exchange_rate: f64,
    pub last_backup_timestamp: Option<DateTime<Utc>>,
    pub is_server_running: bool,
    pub pricing: Pricing,
    pub tos_template: String,
    pub custom_tos_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pricing {
    pub half_body: f64,
    pub full_body: f64,
    pub icon: f64,
    pub custom: f64,
}

impl Default for Pricing {
    fn default() -> Self {
        Self {
            half_body: 150.0,
            full_body: 250.0,
            icon: 80.0,
            custom: 300.0,
        }
    }
}

impl Default for SystemState {
    fn default() -> Self {
        Self {
            exchange_rate: 5.45,
            last_backup_timestamp: None,
            is_server_running: false,
            pricing: Pricing::default(),
            tos_template: "standard".to_string(),
            custom_tos_text: String::new(),
        }
    }
}

impl Default for PersistedState {
    fn default() -> Self {
        Self {
            version: 2,
            updated_at: Utc::now(),
            art_items: vec![],
            video_items: vec![],
            nsfw_items: vec![],
            hero_bg_images: vec![],
            social_items: vec![],
            queue_items: vec![],
            system_state: SystemState::default(),
            active_category: "art".to_string(),
            active_view: "galerias".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub version: u32,
    pub updated_at: DateTime<Utc>,
    pub github_username: Option<String>,
    pub github_repo: Option<String>,
    pub github_pat: Option<String>,
    pub github_oauth_scopes: HashMap<String, bool>,
    pub ssh_public_key: Option<String>,
    pub optimization_api_key: Option<String>,
    pub auto_commit: bool,
    pub optimize_on_build: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: 1,
            updated_at: Utc::now(),
            github_username: None,
            github_repo: None,
            github_pat: None,
            github_oauth_scopes: HashMap::from([
                ("repo".to_string(), true),
                ("workflow".to_string(), true),
                ("read:user".to_string(), false),
            ]),
            ssh_public_key: None,
            optimization_api_key: None,
            auto_commit: true,
            optimize_on_build: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub size_bytes: u64,
    pub item_count: usize,
    pub description: Option<String>,
}
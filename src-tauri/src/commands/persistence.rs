use crate::models::persistence::{PersistedState, Settings, BackupMetadata};
use anyhow::{Context, Result};
use chrono::Utc;
use directories::ProjectDirs;
use serde::Serialize;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri::Manager;
use tauri::command;
use uuid::Uuid;

const STATE_FILE: &str = "state.json";
const SETTINGS_FILE: &str = "settings.json";
const BACKUPS_DIR: &str = "backups";

fn get_data_dir(app: &AppHandle) -> Result<PathBuf> {
    if let Some(proj_dirs) = ProjectDirs::from("com", "studioos", "StudioOS") {
        Ok(proj_dirs.data_local_dir().to_path_buf())
    } else {
        Ok(app.path().app_data_dir()?)
    }
}

fn get_backups_dir(app: &AppHandle) -> Result<PathBuf> {
    let data_dir = get_data_dir(app)?;
    let backups_dir = data_dir.join(BACKUPS_DIR);
    fs::create_dir_all(&backups_dir)?;
    Ok(backups_dir)
}

pub async fn load_state(app: AppHandle) -> Result<PersistedState> {
    let data_dir = get_data_dir(&app)?;
    let file_path = data_dir.join(STATE_FILE);

    if !file_path.exists() {
        return Ok(PersistedState::default());
    }

    let file = File::open(&file_path)
        .with_context(|| format!("Failed to open state file: {:?}", file_path))?;
    let reader = BufReader::new(file);
    let mut state: PersistedState = serde_json::from_reader(reader)
        .with_context(|| format!("Failed to parse state file: {:?}", file_path))?;

    state.updated_at = Utc::now();
    Ok(state)
}

pub async fn save_state(app: AppHandle, mut state: PersistedState) -> Result<()> {
    let data_dir = get_data_dir(&app)?;
    fs::create_dir_all(&data_dir)?;

    let file_path = data_dir.join(STATE_FILE);
    let temp_path = data_dir.join(format!("{}.tmp", STATE_FILE));

    state.updated_at = Utc::now();
    state.version = 2;

    let file = File::create(&temp_path)
        .with_context(|| format!("Failed to create temp state file: {:?}", temp_path))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, &state)
        .with_context(|| "Failed to serialize state")?;

    fs::rename(&temp_path, &file_path)
        .with_context(|| format!("Failed to move temp file to state file: {:?}", file_path))?;

    tracing::info!(path = %file_path.display(), "State saved successfully");
    Ok(())
}

pub async fn load_settings(app: AppHandle) -> Result<Settings> {
    let data_dir = get_data_dir(&app)?;
    let file_path = data_dir.join(SETTINGS_FILE);

    if !file_path.exists() {
        return Ok(Settings::default());
    }

    let file = File::open(&file_path)
        .with_context(|| format!("Failed to open settings file: {:?}", file_path))?;
    let reader = BufReader::new(file);
    let settings: Settings = serde_json::from_reader(reader)
        .with_context(|| format!("Failed to parse settings file: {:?}", file_path))?;

    Ok(settings)
}

pub async fn save_settings(app: AppHandle, mut settings: Settings) -> Result<()> {
    let data_dir = get_data_dir(&app)?;
    fs::create_dir_all(&data_dir)?;

    let file_path = data_dir.join(SETTINGS_FILE);
    let temp_path = data_dir.join(format!("{}.tmp", SETTINGS_FILE));

    settings.updated_at = Utc::now();

    let file = File::create(&temp_path)
        .with_context(|| format!("Failed to create temp settings file: {:?}", temp_path))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, &settings)
        .with_context(|| "Failed to serialize settings")?;

    fs::rename(&temp_path, &file_path)
        .with_context(|| format!("Failed to move temp file to settings file: {:?}", file_path))?;

    tracing::info!(path = %file_path.display(), "Settings saved successfully");
    Ok(())
}

pub async fn create_backup(app: AppHandle, description: Option<String>) -> Result<BackupMetadata> {
    let state = load_state(app.clone()).await?;
    let backups_dir = get_backups_dir(&app)?;

    let backup_id = Uuid::now_v7();
    let timestamp = Utc::now();
    let file_name = format!("backup-{}-{}.json", timestamp.format("%Y%m%d-%H%M%S"), backup_id.simple());
    let file_path = backups_dir.join(&file_name);

    let file = File::create(&file_path)
        .with_context(|| format!("Failed to create backup file: {:?}", file_path))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, &state)
        .with_context(|| "Failed to serialize backup")?;

    let metadata = fs::metadata(&file_path)
        .with_context(|| format!("Failed to get backup metadata: {:?}", file_path))?;

    let backup_meta = BackupMetadata {
        id: backup_id,
        created_at: timestamp,
        size_bytes: metadata.len(),
        item_count: state.art_items.len()
            + state.video_items.len()
            + state.nsfw_items.len()
            + state.hero_bg_images.len()
            + state.social_items.len()
            + state.queue_items.len(),
        description,
    };

    let meta_path = backups_dir.join(format!("{}.meta.json", file_name));
    let meta_file = File::create(&meta_path)?;
    let meta_writer = BufWriter::new(meta_file);
    serde_json::to_writer_pretty(meta_writer, &backup_meta)?;

    cleanup_old_backups(&backups_dir, 50).await?;

    tracing::info!(backup_id = %backup_id, path = %file_path.display(), "Backup created");
    Ok(backup_meta)
}

async fn cleanup_old_backups(backups_dir: &Path, max_backups: usize) -> Result<()> {
    let mut entries: Vec<_> = fs::read_dir(backups_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("json"))
        .filter(|e| e.file_name().to_string_lossy().starts_with("backup-"))
        .collect();

    entries.sort_by_key(|e| e.path());

    while entries.len() > max_backups {
        if let Some(oldest) = entries.first() {
            let meta_path = backups_dir.join(format!("{}.meta.json", oldest.file_name().to_string_lossy()));
            fs::remove_file(&oldest.path()).ok();
            fs::remove_file(&meta_path).ok();
            entries.remove(0);
        }
    }
    Ok(())
}

pub async fn list_backups(app: AppHandle) -> Result<Vec<BackupMetadata>> {
    let backups_dir = get_backups_dir(&app)?;
    let mut backups = Vec::new();

    if !backups_dir.exists() {
        return Ok(backups);
    }

    for entry in fs::read_dir(&backups_dir)? {
        let entry = entry?;
        if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.starts_with("backup-") && file_name.ends_with(".meta.json") {
                let file = File::open(entry.path())?;
                let reader = BufReader::new(file);
                if let Ok(meta) = serde_json::from_reader::<_, BackupMetadata>(reader) {
                    backups.push(meta);
                }
            }
        }
    }

    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(backups)
}

pub async fn restore_backup(app: AppHandle, backup_id: Uuid) -> Result<PersistedState> {
    let backups_dir = get_backups_dir(&app)?;
    let mut found_path = None;

    for entry in fs::read_dir(&backups_dir)? {
        let entry = entry?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with("backup-") && file_name.contains(&backup_id.to_string()) && file_name.ends_with(".json") && !file_name.ends_with(".meta.json") {
            found_path = Some(entry.path());
            break;
        }
    }

    let backup_path = found_path.context("Backup not found")?;

    let file = File::open(&backup_path)
        .with_context(|| format!("Failed to open backup file: {:?}", backup_path))?;
    let reader = BufReader::new(file);
    let state: PersistedState = serde_json::from_reader(reader)
        .with_context(|| format!("Failed to parse backup file: {:?}", backup_path))?;

    save_state(app, state.clone()).await?;

    tracing::info!(backup_id = %backup_id, "Backup restored successfully");
    Ok(state)
}

pub async fn delete_backup(app: AppHandle, backup_id: Uuid) -> Result<()> {
    let backups_dir = get_backups_dir(&app)?;

    for entry in fs::read_dir(&backups_dir)? {
        let entry = entry?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with("backup-") && file_name.contains(&backup_id.to_string()) {
            fs::remove_file(entry.path()).ok();
        }
    }

    tracing::info!(backup_id = %backup_id, "Backup deleted");
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct StorageInfo {
    pub state_size_bytes: u64,
    pub settings_size_bytes: u64,
    pub backups_count: usize,
    pub backups_total_size: u64,
    pub data_dir: String,
}

pub async fn get_storage_info(app: AppHandle) -> Result<StorageInfo> {
    let data_dir = get_data_dir(&app)?;
    let backups_dir = get_backups_dir(&app)?;

    let state_size = fs::metadata(data_dir.join(STATE_FILE)).map(|m| m.len()).unwrap_or(0);
    let settings_size = fs::metadata(data_dir.join(SETTINGS_FILE)).map(|m| m.len()).unwrap_or(0);

    let mut backups_count = 0;
    let mut backups_total_size = 0u64;

    if backups_dir.exists() {
        for entry in fs::read_dir(&backups_dir)? {
            let entry = entry?;
            let meta = entry.metadata()?;
            if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                let file_name = entry.file_name().to_string_lossy().to_string();
                if file_name.starts_with("backup-") && !file_name.ends_with(".meta.json") {
                    backups_count += 1;
                    backups_total_size += meta.len();
                }
            }
        }
    }

    Ok(StorageInfo {
        state_size_bytes: state_size,
        settings_size_bytes: settings_size,
        backups_count,
        backups_total_size,
        data_dir: data_dir.display().to_string(),
    })
}

#[command]
pub async fn load_settings_cmd(app: AppHandle) -> Result<Settings, String> {
    load_settings(app).await.map_err(|e| e.to_string())
}

#[command]
pub async fn save_settings_cmd(app: AppHandle, settings: Settings) -> Result<(), String> {
    save_settings(app, settings).await.map_err(|e| e.to_string())
}

#[command]
pub async fn load_state_cmd(app: AppHandle) -> Result<PersistedState, String> {
    load_state(app).await.map_err(|e| e.to_string())
}

#[command]
pub async fn save_state_cmd(app: AppHandle, state: PersistedState) -> Result<(), String> {
    save_state(app, state).await.map_err(|e| e.to_string())
}

#[command]
pub async fn create_backup_cmd(app: AppHandle, description: Option<String>) -> Result<BackupMetadata, String> {
    create_backup(app, description).await.map_err(|e| e.to_string())
}

#[command]
pub async fn list_backups_cmd(app: AppHandle) -> Result<Vec<BackupMetadata>, String> {
    list_backups(app).await.map_err(|e| e.to_string())
}

#[command]
pub async fn restore_backup_cmd(app: AppHandle, backup_id: String) -> Result<PersistedState, String> {
    let id = Uuid::parse_str(&backup_id).map_err(|e| format!("Invalid backup ID: {}", e))?;
    restore_backup(app, id).await.map_err(|e| e.to_string())
}

#[command]
pub async fn delete_backup_cmd(app: AppHandle, backup_id: String) -> Result<(), String> {
    let id = Uuid::parse_str(&backup_id).map_err(|e| format!("Invalid backup ID: {}", e))?;
    delete_backup(app, id).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_storage_info_cmd(app: AppHandle) -> Result<StorageInfo, String> {
    get_storage_info(app).await.map_err(|e| e.to_string())
}
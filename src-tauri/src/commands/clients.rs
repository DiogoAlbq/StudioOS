use crate::models::client::{Client, ClientCommission};
use anyhow::{Context, Result};
use chrono::Utc;
use directories::ProjectDirs;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use tauri::command;
use uuid::Uuid;

const CLIENTS_FILE: &str = "clients.json";
const COMMISSIONS_FILE: &str = "client_commissions.json";

fn get_data_dir(app: &AppHandle) -> Result<PathBuf> {
    if let Some(proj_dirs) = ProjectDirs::from("com", "studioos", "StudioOS") {
        Ok(proj_dirs.data_local_dir().to_path_buf())
    } else {
        Ok(app.path().app_data_dir()?)
    }
}

pub async fn load_clients(app: &AppHandle) -> Result<Vec<Client>> {
    let data_dir = get_data_dir(app)?;
    let file_path = data_dir.join(CLIENTS_FILE);

    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let file = File::open(&file_path)
        .with_context(|| format!("Failed to open clients file: {:?}", file_path))?;
    let reader = BufReader::new(file);
    let clients: Vec<Client> = serde_json::from_reader(reader)
        .with_context(|| format!("Failed to parse clients file: {:?}", file_path))?;

    Ok(clients)
}

pub async fn save_clients(app: &AppHandle, clients: &[Client]) -> Result<()> {
    let data_dir = get_data_dir(app)?;
    fs::create_dir_all(&data_dir)?;

    let file_path = data_dir.join(CLIENTS_FILE);
    let temp_path = data_dir.join(format!("{}.tmp", CLIENTS_FILE));

    let file = File::create(&temp_path)
        .with_context(|| format!("Failed to create temp clients file: {:?}", temp_path))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, clients)
        .with_context(|| "Failed to serialize clients")?;

    fs::rename(&temp_path, &file_path)
        .with_context(|| format!("Failed to move temp file to clients file: {:?}", file_path))?;

    tracing::info!(count = clients.len(), "Clients saved");
    Ok(())
}

pub async fn load_commissions(app: &AppHandle) -> Result<Vec<ClientCommission>> {
    let data_dir = get_data_dir(app)?;
    let file_path = data_dir.join(COMMISSIONS_FILE);

    if !file_path.exists() {
        return Ok(Vec::new());
    }

    let file = File::open(&file_path)
        .with_context(|| format!("Failed to open commissions file: {:?}", file_path))?;
    let reader = BufReader::new(file);
    let commissions: Vec<ClientCommission> = serde_json::from_reader(reader)
        .with_context(|| format!("Failed to parse commissions file: {:?}", file_path))?;

    Ok(commissions)
}

pub async fn save_commissions(app: &AppHandle, commissions: &[ClientCommission]) -> Result<()> {
    let data_dir = get_data_dir(app)?;
    fs::create_dir_all(&data_dir)?;

    let file_path = data_dir.join(COMMISSIONS_FILE);
    let temp_path = data_dir.join(format!("{}.tmp", COMMISSIONS_FILE));

    let file = File::create(&temp_path)
        .with_context(|| format!("Failed to create temp commissions file: {:?}", temp_path))?;
    let writer = BufWriter::new(file);
    serde_json::to_writer_pretty(writer, commissions)
        .with_context(|| "Failed to serialize commissions")?;

    fs::rename(&temp_path, &file_path)
        .with_context(|| format!("Failed to move temp file: {:?}", file_path))?;

    tracing::info!(count = commissions.len(), "Commissions saved");
    Ok(())
}

#[command]
pub async fn create_client_cmd(
    app: AppHandle,
    name: String,
    email: Option<String>,
    discord: Option<String>,
    whatsapp: Option<String>,
    notes: Option<String>,
) -> Result<Client, String> {
    let mut client = Client::new(name);
    client.email = email;
    client.discord = discord;
    client.whatsapp = whatsapp;
    client.notes = notes;

    let mut clients = load_clients(&app).await.map_err(|e| e.to_string())?;
    clients.push(client.clone());
    save_clients(&app, &clients).await.map_err(|e| e.to_string())?;

    Ok(client)
}

#[command]
pub async fn list_clients_cmd(app: AppHandle) -> Result<Vec<Client>, String> {
    load_clients(&app).await.map_err(|e| e.to_string())
}

#[command]
pub async fn get_client_cmd(app: AppHandle, client_id: String) -> Result<Client, String> {
    let clients = load_clients(&app).await.map_err(|e| e.to_string())?;
    let id = Uuid::parse_str(&client_id).map_err(|e| format!("Invalid client ID: {}", e))?;

    clients
        .iter()
        .find(|c| c.id == id)
        .cloned()
        .ok_or_else(|| format!("Client not found: {}", client_id))
}

#[command]
pub async fn update_client_cmd(
    app: AppHandle,
    client_id: String,
    name: Option<String>,
    email: Option<String>,
    discord: Option<String>,
    whatsapp: Option<String>,
    notes: Option<String>,
) -> Result<Client, String> {
    let mut clients = load_clients(&app).await.map_err(|e| e.to_string())?;
    let id = Uuid::parse_str(&client_id).map_err(|e| format!("Invalid client ID: {}", e))?;

    let client = clients
        .iter_mut()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("Client not found: {}", client_id))?;

    if let Some(n) = name { client.name = n; }
    if let Some(e) = email { client.email = Some(e); }
    if let Some(d) = discord { client.discord = Some(d); }
    if let Some(w) = whatsapp { client.whatsapp = Some(w); }
    if let Some(n) = notes { client.notes = Some(n); }
    client.updated_at = Utc::now();

    let result = client.clone();
    save_clients(&app, &clients).await.map_err(|e| e.to_string())?;

    Ok(result)
}

#[command]
pub async fn delete_client_cmd(app: AppHandle, client_id: String) -> Result<(), String> {
    let mut clients = load_clients(&app).await.map_err(|e| e.to_string())?;
    let id = Uuid::parse_str(&client_id).map_err(|e| format!("Invalid client ID: {}", e))?;

    let before = clients.len();
    clients.retain(|c| c.id != id);

    if clients.len() == before {
        return Err(format!("Client not found: {}", client_id));
    }

    save_clients(&app, &clients).await.map_err(|e| e.to_string())?;

    tracing::info!(client_id = %id, "Client deleted");
    Ok(())
}

#[command]
pub async fn add_client_commission_cmd(
    app: AppHandle,
    client_id: String,
    req_id: String,
    art_type: String,
    status: String,
    priority: String,
    price_usd: Option<f64>,
    stage_name: Option<String>,
    notes: Option<String>,
) -> Result<ClientCommission, String> {
    let id = Uuid::parse_str(&client_id).map_err(|e| format!("Invalid client ID: {}", e))?;

    let commission = ClientCommission {
        id: Uuid::now_v7(),
        client_id: id,
        req_id,
        art_type,
        status,
        priority,
        price_usd,
        stage_name,
        notes,
        created_at: Utc::now(),
        completed_at: None,
    };

    let mut commissions = load_commissions(&app).await.map_err(|e| e.to_string())?;
    commissions.push(commission.clone());
    save_commissions(&app, &commissions).await.map_err(|e| e.to_string())?;

    Ok(commission)
}

#[command]
pub async fn get_client_commissions_cmd(
    app: AppHandle,
    client_id: String,
) -> Result<Vec<ClientCommission>, String> {
    let id = Uuid::parse_str(&client_id).map_err(|e| format!("Invalid client ID: {}", e))?;
    let commissions = load_commissions(&app).await.map_err(|e| e.to_string())?;

    Ok(commissions
        .into_iter()
        .filter(|c| c.client_id == id)
        .collect())
}

#[command]
pub async fn get_client_history_cmd(
    app: AppHandle,
    client_id: String,
) -> Result<serde_json::Value, String> {
    let id = Uuid::parse_str(&client_id).map_err(|e| format!("Invalid client ID: {}", e))?;
    let clients = load_clients(&app).await.map_err(|e| e.to_string())?;
    let commissions = load_commissions(&app).await.map_err(|e| e.to_string())?;

    let client = clients
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("Client not found: {}", client_id))?;

    let client_commissions: Vec<&ClientCommission> = commissions
        .iter()
        .filter(|c| c.client_id == id)
        .collect();

    let total_spent: f64 = client_commissions
        .iter()
        .filter_map(|c| c.price_usd)
        .sum();

    let completed = client_commissions
        .iter()
        .filter(|c| c.status == "Completed")
        .count();

    let in_progress = client_commissions
        .iter()
        .filter(|c| c.status == "In Progress")
        .count();

    let pending = client_commissions
        .iter()
        .filter(|c| c.status == "Pending")
        .count();

    Ok(serde_json::json!({
        "client": client,
        "commissions": client_commissions,
        "stats": {
            "total_commissions": client_commissions.len(),
            "total_spent_usd": total_spent,
            "completed": completed,
            "in_progress": in_progress,
            "pending": pending,
        }
    }))
}

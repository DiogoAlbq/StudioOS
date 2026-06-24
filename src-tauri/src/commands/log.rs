use crate::logger::{get_logs, export_logs, clear_logs, get_session_id, ExportFormat, LOG_BUFFER, MAX_IN_MEMORY_LOGS};
use crate::models::log_entry::{LogEntry, LogLevel, LogSource, LogQuery};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::command;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogQueryArgs {
    pub level: Option<String>,
    pub source: Option<String>,
    pub target: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub correlation_id: Option<String>,
    pub session_id: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

impl From<LogQueryArgs> for LogQuery {
    fn from(args: LogQueryArgs) -> Self {
        Self {
            level: args.level.and_then(|s| parse_level(&s)),
            source: args.source.and_then(|s| parse_source(&s)),
            target: args.target,
            start_time: args.start_time.and_then(|s| parse_datetime(&s)),
            end_time: args.end_time.and_then(|s| parse_datetime(&s)),
            correlation_id: args.correlation_id.and_then(|s| Uuid::parse_str(&s).ok()),
            session_id: args.session_id.and_then(|s| Uuid::parse_str(&s).ok()),
            limit: args.limit,
            offset: args.offset,
        }
    }
}

fn parse_level(s: &str) -> Option<LogLevel> {
    match s.to_lowercase().as_str() {
        "trace" => Some(LogLevel::Trace),
        "debug" => Some(LogLevel::Debug),
        "info" => Some(LogLevel::Info),
        "warn" => Some(LogLevel::Warn),
        "error" => Some(LogLevel::Error),
        _ => None,
    }
}

fn parse_source(s: &str) -> Option<LogSource> {
    match s.to_lowercase().as_str() {
        "frontend" => Some(LogSource::Frontend),
        "backend" => Some(LogSource::Backend),
        "tauri" => Some(LogSource::Tauri),
        "plugin" => Some(LogSource::Plugin),
        _ => None,
    }
}

fn parse_datetime(s: &str) -> Option<chrono::DateTime<chrono::Utc>> {
    chrono::DateTime::parse_from_rfc3339(s).ok().map(|dt| dt.with_timezone(&chrono::Utc))
}

#[command]
pub async fn get_logs_cmd(query: LogQueryArgs) -> Result<Vec<LogEntry>, String> {
    get_logs(query.into()).map_err(|e| e.to_string())
}

#[command]
pub async fn export_logs_cmd(query: LogQueryArgs, format: String) -> Result<String, String> {
    let fmt = match format.to_lowercase().as_str() {
        "json" => ExportFormat::Json,
        "jsonl" => ExportFormat::Jsonl,
        "csv" => ExportFormat::Csv,
        _ => ExportFormat::Json,
    };
    export_logs(query.into(), fmt).map_err(|e| e.to_string())
}

#[command]
pub async fn clear_logs_cmd() -> Result<(), String> {
    clear_logs().map_err(|e| e.to_string())
}

#[command]
pub async fn get_session_id_cmd() -> Result<Option<String>, String> {
    Ok(get_session_id().map(|id| id.to_string()))
}

#[command]
pub async fn log_frontend_event(
    level: String,
    target: String,
    message: String,
    fields: Option<serde_json::Value>,
    correlation_id: Option<String>,
) -> Result<(), String> {
    let level = parse_level(&level).unwrap_or(LogLevel::Info);
    let source = LogSource::Frontend;

    let entry = LogEntry {
        id: Uuid::now_v7(),
        timestamp: Utc::now(),
        level,
        target,
        message,
        fields: fields.unwrap_or(serde_json::json!({})),
        source,
        correlation_id: correlation_id.and_then(|s| Uuid::parse_str(&s).ok()),
        session_id: get_session_id(),
    };

    let mut buffer = LOG_BUFFER.lock().map_err(|e| e.to_string())?;
    if buffer.len() >= MAX_IN_MEMORY_LOGS {
        buffer.pop_front();
    }
    buffer.push_back(entry);

    Ok(())
}

#[derive(Debug, Serialize)]
pub struct LogStats {
    pub total: usize,
    pub by_level: std::collections::HashMap<String, usize>,
    pub by_source: std::collections::HashMap<String, usize>,
    pub oldest: Option<String>,
    pub newest: Option<String>,
}

#[command]
pub async fn get_log_stats() -> Result<LogStats, String> {
    let buffer = LOG_BUFFER.lock().map_err(|e| e.to_string())?;
    let logs: Vec<LogEntry> = buffer.iter().cloned().collect();

    let mut by_level = std::collections::HashMap::new();
    let mut by_source = std::collections::HashMap::new();

    for log in &logs {
        *by_level.entry(format!("{:?}", log.level)).or_insert(0) += 1;
        *by_source.entry(format!("{:?}", log.source)).or_insert(0) += 1;
    }

    let oldest = logs.iter().min_by_key(|l| l.timestamp).map(|l| l.timestamp.to_rfc3339());
    let newest = logs.iter().max_by_key(|l| l.timestamp).map(|l| l.timestamp.to_rfc3339());

    Ok(LogStats {
        total: logs.len(),
        by_level,
        by_source,
        oldest,
        newest,
    })
}
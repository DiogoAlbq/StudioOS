use crate::models::log_entry::{LogEntry, LogLevel, LogSource, LogQuery};
use anyhow::Result;
use chrono::Utc;
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::fs::{self, File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Manager;
use tracing::{Event, Subscriber};
use tracing_subscriber::fmt::MakeWriter;
use tracing_subscriber::layer::{Context, Layer};
use tracing_subscriber::prelude::*;
use tracing_subscriber::registry::LookupSpan;
use uuid::Uuid;

pub(crate) const MAX_IN_MEMORY_LOGS: usize = 10000;
const LOG_FILE_MAX_SIZE: u64 = 10 * 1024 * 1024;
const LOG_FILE_MAX_COUNT: usize = 30;

lazy_static::lazy_static! {
    pub(crate) static ref LOG_BUFFER: Arc<Mutex<VecDeque<LogEntry>>> = Arc::new(Mutex::new(VecDeque::new()));
    static ref LOG_WRITER: Arc<Mutex<Option<BufWriter<File>>>> = Arc::new(Mutex::new(None));
    static ref LOG_PATH: Arc<Mutex<Option<PathBuf>>> = Arc::new(Mutex::new(None));
    static ref CURRENT_SESSION_ID: Arc<Mutex<Option<Uuid>>> = Arc::new(Mutex::new(None));
}

pub fn init_logging(app_handle: &tauri::AppHandle) -> Result<()> {
    let log_dir = get_log_dir(app_handle)?;
    fs::create_dir_all(&log_dir)?;

    let session_id = Uuid::now_v7();
    *CURRENT_SESSION_ID.lock().unwrap() = Some(session_id);

    let log_file = log_dir.join(format!("studioos-{}.log", Utc::now().format("%Y-%m-%d")));
    *LOG_PATH.lock().unwrap() = Some(log_file.clone());

    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)?;
    *LOG_WRITER.lock().unwrap() = Some(BufWriter::new(file));

    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info,tauri=warn,wry=warn".into());

    let json_layer = tracing_subscriber::fmt::layer()
        .json()
        .with_current_span(true)
        .with_span_list(true)
        .with_writer(ArcLogWriter);

    let console_layer = tracing_subscriber::fmt::layer()
        .with_writer(std::io::stdout)
        .with_ansi(true)
        .with_filter(filter.clone());

    tracing_subscriber::registry()
        .with(filter)
        .with(json_layer)
        .with(console_layer)
        .with(BufferLayer)
        .init();

    tracing::info!(session_id = %session_id, "Logging initialized");
    Ok(())
}

pub(crate) fn get_log_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf> {
    if let Some(proj_dirs) = ProjectDirs::from("com", "studioos", "StudioOS") {
        Ok(proj_dirs.data_local_dir().join("logs"))
    } else {
        Ok(app_handle.path().app_data_dir()?.join("logs"))
    }
}

pub fn get_logs(query: LogQuery) -> Result<Vec<LogEntry>> {
    let buffer = LOG_BUFFER.lock().unwrap();
    let mut logs: Vec<LogEntry> = buffer.iter().cloned().collect();

    if let Some(level) = query.level {
        logs.retain(|l| l.level as u8 >= level as u8);
    }
    if let Some(source) = query.source {
        logs.retain(|l| l.source == source);
    }
    if let Some(target) = query.target {
        logs.retain(|l| l.target.contains(&target));
    }
    if let Some(start) = query.start_time {
        logs.retain(|l| l.timestamp >= start);
    }
    if let Some(end) = query.end_time {
        logs.retain(|l| l.timestamp <= end);
    }
    if let Some(corr_id) = query.correlation_id {
        logs.retain(|l| l.correlation_id == Some(corr_id));
    }
    if let Some(sess_id) = query.session_id {
        logs.retain(|l| l.session_id == Some(sess_id));
    }

    logs.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(1000);
    Ok(logs.into_iter().skip(offset).take(limit).collect())
}

pub fn export_logs(query: LogQuery, format: ExportFormat) -> Result<String> {
    let logs = get_logs(query)?;
    match format {
        ExportFormat::Json => Ok(serde_json::to_string_pretty(&logs)?),
        ExportFormat::Jsonl => Ok(logs.iter().map(|l| serde_json::to_string(l).unwrap()).collect::<Vec<_>>().join("\n")),
        ExportFormat::Csv => {
            let mut wtr = csv::Writer::from_writer(vec![]);
            for log in logs {
                wtr.serialize(log)?;
            }
            Ok(String::from_utf8(wtr.into_inner()?)?)
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Json,
    Jsonl,
    Csv,
}

pub fn clear_logs() -> Result<()> {
    let mut buffer = LOG_BUFFER.lock().unwrap();
    buffer.clear();
    if let Some(path) = LOG_PATH.lock().unwrap().as_ref() {
        if path.exists() {
            fs::remove_file(path)?;
        }
    }
    Ok(())
}

pub fn get_session_id() -> Option<Uuid> {
    *CURRENT_SESSION_ID.lock().unwrap()
}

struct ArcLogWriter;

impl Write for ArcLogWriter {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        if let Ok(mut writer) = LOG_WRITER.lock() {
            if let Some(ref mut w) = *writer {
                w.write_all(buf)?;
                w.flush()?;
            }
        }
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        if let Ok(mut writer) = LOG_WRITER.lock() {
            if let Some(ref mut w) = *writer {
                w.flush()?;
            }
        }
        Ok(())
    }
}

impl<'a> MakeWriter<'a> for ArcLogWriter {
    type Writer = ArcLogWriter;
    fn make_writer(&'a self) -> Self::Writer {
        ArcLogWriter
    }
}

struct BufferLayer;

impl<S> Layer<S> for BufferLayer
where
    S: Subscriber + for<'a> LookupSpan<'a>,
{
    fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
        let mut visitor = JsonFieldVisitor::default();
        event.record(&mut visitor);

        let level = LogLevel::from(*event.metadata().level());
        let target = event.metadata().target().to_string();
        let message = visitor.message.unwrap_or_default();
        let fields = visitor.fields;

        let entry = LogEntry {
            id: Uuid::now_v7(),
            timestamp: Utc::now(),
            level,
            target,
            message,
            fields,
            source: LogSource::Backend,
            correlation_id: None,
            session_id: *CURRENT_SESSION_ID.lock().unwrap(),
        };

        let mut buffer = LOG_BUFFER.lock().unwrap();
        if buffer.len() >= MAX_IN_MEMORY_LOGS {
            buffer.pop_front();
        }
        buffer.push_back(entry);
    }
}

#[derive(Default)]
struct JsonFieldVisitor {
    message: Option<String>,
    fields: serde_json::Value,
}

impl tracing::field::Visit for JsonFieldVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = Some(format!("{:?}", value));
        } else {
            self.fields[field.name()] = serde_json::Value::String(format!("{:?}", value));
        }
    }

    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.message = Some(value.to_string());
        } else {
            self.fields[field.name()] = serde_json::Value::String(value.to_string());
        }
    }

    fn record_f64(&mut self, field: &tracing::field::Field, value: f64) {
        self.fields[field.name()] = serde_json::Value::Number(serde_json::Number::from_f64(value).unwrap());
    }

    fn record_i64(&mut self, field: &tracing::field::Field, value: i64) {
        self.fields[field.name()] = serde_json::Value::Number(value.into());
    }

    fn record_u64(&mut self, field: &tracing::field::Field, value: u64) {
        self.fields[field.name()] = serde_json::Value::Number(value.into());
    }

    fn record_bool(&mut self, field: &tracing::field::Field, value: bool) {
        self.fields[field.name()] = serde_json::Value::Bool(value);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_log_buffer() {
        let buffer = Arc::new(Mutex::new(VecDeque::new()));
        let mut buf = buffer.lock().unwrap();
        for i in 0..MAX_IN_MEMORY_LOGS + 100 {
            buf.push_back(LogEntry {
                id: Uuid::now_v7(),
                timestamp: Utc::now(),
                level: LogLevel::Info,
                target: "test".into(),
                message: format!("Test {}", i),
                fields: serde_json::json!({}),
                source: LogSource::Backend,
                correlation_id: None,
                session_id: None,
            });
        }
        assert_eq!(buf.len(), MAX_IN_MEMORY_LOGS);
    }
}
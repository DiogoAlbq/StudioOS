use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub target: String,
    pub message: String,
    pub fields: serde_json::Value,
    pub source: LogSource,
    pub correlation_id: Option<Uuid>,
    pub session_id: Option<Uuid>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

impl From<tracing::Level> for LogLevel {
    fn from(level: tracing::Level) -> Self {
        match level {
            tracing::Level::TRACE => LogLevel::Trace,
            tracing::Level::DEBUG => LogLevel::Debug,
            tracing::Level::INFO => LogLevel::Info,
            tracing::Level::WARN => LogLevel::Warn,
            tracing::Level::ERROR => LogLevel::Error,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LogSource {
    Frontend,
    Backend,
    Tauri,
    Plugin,
}

impl Default for LogSource {
    fn default() -> Self {
        LogSource::Backend
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogQuery {
    pub level: Option<LogLevel>,
    pub source: Option<LogSource>,
    pub target: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub correlation_id: Option<Uuid>,
    pub session_id: Option<Uuid>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

impl Default for LogQuery {
    fn default() -> Self {
        Self {
            level: None,
            source: None,
            target: None,
            start_time: None,
            end_time: None,
            correlation_id: None,
            session_id: None,
            limit: Some(1000),
            offset: Some(0),
        }
    }
}
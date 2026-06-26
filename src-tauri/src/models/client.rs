use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: Uuid,
    pub name: String,
    pub email: Option<String>,
    pub discord: Option<String>,
    pub whatsapp: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub total_commissions: u32,
    pub total_spent_usd: f64,
}

impl Client {
    pub fn new(name: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::now_v7(),
            name,
            email: None,
            discord: None,
            whatsapp: None,
            notes: None,
            created_at: now,
            updated_at: now,
            total_commissions: 0,
            total_spent_usd: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientCommission {
    pub id: Uuid,
    pub client_id: Uuid,
    pub req_id: String,
    pub art_type: String,
    pub status: String,
    pub priority: String,
    pub price_usd: Option<f64>,
    pub stage_name: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

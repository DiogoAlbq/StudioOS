use anyhow::{Context, Result};
use reqwest::Client;
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use reqwest_retry::{policies::ExponentialBackoff, RetryTransientMiddleware};
use serde::{Deserialize, Serialize};
use tauri::command;

const GITHUB_API: &str = "https://api.github.com";

fn build_client(pat: &str) -> Result<ClientWithMiddleware> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        "Authorization",
        reqwest::header::HeaderValue::from_str(&format!("Bearer {}", pat))?,
    );
    headers.insert(
        "Accept",
        reqwest::header::HeaderValue::from_static("application/vnd.github+json"),
    );
    headers.insert(
        "X-GitHub-Api-Version",
        reqwest::header::HeaderValue::from_static("2022-11-28"),
    );

    let retry_policy = ExponentialBackoff::builder()
        .build_with_max_retries(3);

    let client = Client::builder()
        .default_headers(headers)
        .user_agent("StudioOS/2.0.0")
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .context("Failed to build HTTP client")?;

    Ok(ClientBuilder::new(client)
        .with(RetryTransientMiddleware::new_with_policy(retry_policy))
        .build())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubUser {
    pub login: String,
    pub id: u64,
    pub avatar_url: Option<String>,
    pub name: Option<String>,
    pub bio: Option<String>,
    pub public_repos: Option<u32>,
    pub followers: Option<u32>,
    pub following: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubRepo {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub private: bool,
    pub fork: bool,
    pub default_branch: Option<String>,
    pub updated_at: Option<String>,
    pub pushed_at: Option<String>,
    pub language: Option<String>,
    pub stargazers_count: u32,
    pub forks_count: u32,
    pub open_issues_count: u32,
    pub archived: bool,
    pub disabled: bool,
    pub topics: Option<Vec<String>>,
    pub visibility: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubWorkflow {
    pub id: u64,
    pub name: String,
    pub path: String,
    pub state: String,
    pub created_at: String,
    pub updated_at: String,
    pub url: Option<String>,
    pub badge_url: Option<String>,
    pub html_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubWorkflowRun {
    pub id: u64,
    pub name: String,
    pub head_branch: Option<String>,
    pub head_sha: Option<String>,
    pub status: String,
    pub conclusion: Option<String>,
    pub workflow_id: u64,
    pub run_number: u32,
    pub created_at: String,
    pub updated_at: String,
    pub html_url: String,
    pub event: String,
    pub actor: Option<GitHubActor>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubActor {
    pub login: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepoContents {
    pub name: String,
    pub path: String,
    pub sha: String,
    pub size: u64,
    pub url: String,
    #[serde(rename = "type")]
    pub content_type: String,
    pub content: Option<String>,
    pub encoding: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkflowDispatch {
    pub ref_branch: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inputs: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeploymentResult {
    pub success: bool,
    pub message: String,
    pub workflow_run_id: Option<u64>,
}

#[command]
pub async fn github_check_pat(pat: String) -> Result<GitHubUser, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{}/user", GITHUB_API))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to GitHub: {}", e))?;

    if resp.status().is_success() {
        resp.json::<GitHubUser>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_list_repos(pat: String, page: Option<u32>, per_page: Option<u32>) -> Result<Vec<GitHubRepo>, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;
    let p = page.unwrap_or(1);
    let pp = per_page.unwrap_or(30);

    let resp = client
        .get(format!("{}/user/repos", GITHUB_API))
        .query(&[("page", p.to_string().as_str()), ("per_page", pp.to_string().as_str()), ("sort", "updated"), ("direction", "desc")])
        .send()
        .await
        .map_err(|e| format!("Failed to fetch repos: {}", e))?;

    if resp.status().is_success() {
        resp.json::<Vec<GitHubRepo>>()
            .await
            .map_err(|e| format!("Failed to parse repos: {}", e))
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_get_repo(pat: String, owner: String, repo: String) -> Result<GitHubRepo, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let resp = client
        .get(format!("{}/repos/{}/{}", GITHUB_API, owner, repo))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch repo: {}", e))?;

    if resp.status().is_success() {
        resp.json::<GitHubRepo>()
            .await
            .map_err(|e| format!("Failed to parse repo: {}", e))
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_list_workflows(pat: String, owner: String, repo: String) -> Result<Vec<GitHubWorkflow>, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let resp = client
        .get(format!("{}/repos/{}/{}/actions/workflows", GITHUB_API, owner, repo))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch workflows: {}", e))?;

    if resp.status().is_success() {
        #[derive(Deserialize)]
        struct WorkflowsResponse {
            workflows: Vec<GitHubWorkflow>,
        }
        let data = resp
            .json::<WorkflowsResponse>()
            .await
            .map_err(|e| format!("Failed to parse workflows: {}", e))?;
        Ok(data.workflows)
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_trigger_workflow(
    pat: String,
    owner: String,
    repo: String,
    workflow_id: u64,
    branch: String,
) -> Result<DeploymentResult, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let dispatch = serde_json::json!({
        "ref": branch,
    });

    let resp = client
        .post(format!(
            "{}/repos/{}/{}/actions/workflows/{}/dispatches",
            GITHUB_API, owner, repo, workflow_id
        ))
        .body(serde_json::to_string(&dispatch).unwrap_or_default())
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to trigger workflow: {}", e))?;

    if resp.status().is_success() || resp.status().as_u16() == 204 {
        Ok(DeploymentResult {
            success: true,
            message: "Workflow triggered successfully".to_string(),
            workflow_run_id: None,
        })
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_list_workflow_runs(
    pat: String,
    owner: String,
    repo: String,
    workflow_id: Option<u64>,
    per_page: Option<u32>,
) -> Result<Vec<GitHubWorkflowRun>, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;
    let pp = per_page.unwrap_or(10);

    let url = if let Some(wf_id) = workflow_id {
        format!(
            "{}/repos/{}/{}/actions/workflows/{}/runs",
            GITHUB_API, owner, repo, wf_id
        )
    } else {
        format!("{}/repos/{}/{}/actions/runs", GITHUB_API, owner, repo)
    };

    let resp = client
        .get(url)
        .query(&[("per_page", pp)])
        .send()
        .await
        .map_err(|e| format!("Failed to fetch workflow runs: {}", e))?;

    if resp.status().is_success() {
        #[derive(Deserialize)]
        struct RunsResponse {
            workflow_runs: Vec<GitHubWorkflowRun>,
        }
        let data = resp
            .json::<RunsResponse>()
            .await
            .map_err(|e| format!("Failed to parse workflow runs: {}", e))?;
        Ok(data.workflow_runs)
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_get_file_content(
    pat: String,
    owner: String,
    repo: String,
    path: String,
    branch: Option<String>,
) -> Result<RepoContents, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let mut req = client.get(format!(
        "{}/repos/{}/{}/contents/{}",
        GITHUB_API, owner, repo, path
    ));

    if let Some(br) = branch {
        req = req.query(&[("ref", br.as_str())]);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Failed to fetch file: {}", e))?;

    if resp.status().is_success() {
        resp.json::<RepoContents>()
            .await
            .map_err(|e| format!("Failed to parse file contents: {}", e))
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_create_or_update_file(
    pat: String,
    owner: String,
    repo: String,
    path: String,
    content: String,
    message: String,
    branch: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let encoded = base64_encode(&content);

    let body = serde_json::json!({
        "message": message,
        "content": encoded,
        "branch": branch,
    });

    let resp = client
        .put(format!(
            "{}/repos/{}/{}/contents/{}",
            GITHUB_API, owner, repo, path
        ))
        .body(serde_json::to_string(&body).unwrap_or_default())
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to create/update file: {}", e))?;

    if resp.status().is_success() {
        resp.json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_delete_repo(
    pat: String,
    owner: String,
    repo: String,
) -> Result<DeploymentResult, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let resp = client
        .delete(format!("{}/repos/{}/{}", GITHUB_API, owner, repo))
        .send()
        .await
        .map_err(|e| format!("Failed to delete repo: {}", e))?;

    if resp.status().is_success() || resp.status().as_u16() == 204 {
        Ok(DeploymentResult {
            success: true,
            message: format!("Repositorio {}/{} deletado com sucesso", owner, repo),
            workflow_run_id: None,
        })
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[command]
pub async fn github_get_pages_info(
    pat: String,
    owner: String,
    repo: String,
) -> Result<serde_json::Value, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let resp = client
        .get(format!(
            "{}/repos/{}/{}/pages",
            GITHUB_API, owner, repo
        ))
        .send()
        .await
        .map_err(|e| format!("Failed to get pages info: {}", e))?;

    if resp.status().is_success() {
        resp.json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Failed to parse pages info: {}", e))
    } else {
        Err(format!("GitHub Pages not enabled or not found (status {})", resp.status()))
    }
}

#[command]
pub async fn github_enable_pages(
    pat: String,
    owner: String,
    repo: String,
    branch: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "build_type": "legacy",
        "source": {
            "branch": branch.unwrap_or_else(|| "gh-pages".to_string()),
            "path": "/"
        }
    });

    let resp = client
        .post(format!(
            "{}/repos/{}/{}/pages",
            GITHUB_API, owner, repo
        ))
        .body(serde_json::to_string(&body).unwrap_or_default())
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to enable pages: {}", e))?;

    if resp.status().is_success() || resp.status().as_u16() == 204 || resp.status().as_u16() == 201 {
        let site_url = format!("https://{}.github.io/{}/", owner, repo);
        Ok(serde_json::json!({
            "success": true,
            "site_url": site_url,
            "message": format!("GitHub Pages habilitado em {}", site_url)
        }))
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error ({}): {}", status, body))
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SiteDataPush {
    pub portfolio: String,
    pub config: String,
    pub queue: String,
    pub pricing: String,
}

async fn get_file_sha(
    client: &ClientWithMiddleware,
    _pat: &str,
    owner: &str,
    repo: &str,
    path: &str,
) -> Option<String> {
    let resp = client
        .get(format!(
            "{}/repos/{}/{}/contents/{}",
            GITHUB_API, owner, repo, path
        ))
        .send()
        .await
        .ok()?;

    if resp.status().is_success() {
        let val: serde_json::Value = resp.json().await.ok()?;
        val.get("sha")?.as_str().map(|s| s.to_string())
    } else {
        None
    }
}

async fn create_or_update_file(
    client: &ClientWithMiddleware,
    pat: &str,
    owner: &str,
    repo: &str,
    path: &str,
    content: &str,
    message: &str,
) -> Result<(), String> {
    let sha = get_file_sha(client, pat, owner, repo, path).await;

    let mut body = serde_json::json!({
        "message": message,
        "content": base64_encode(content),
    });

    if let Some(sha) = sha {
        body["sha"] = serde_json::Value::String(sha);
    }

    let resp = client
        .put(format!(
            "{}/repos/{}/{}/contents/{}",
            GITHUB_API, owner, repo, path
        ))
        .body(serde_json::to_string(&body).unwrap_or_default())
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|e| format!("Failed to create/update {}: {}", path, e))?;

    if resp.status().is_success() || resp.status().as_u16() == 201 {
        Ok(())
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        Err(format!("GitHub API error updating {} ({}): {}", path, status, body))
    }
}

#[command]
pub async fn github_push_site_data(
    pat: String,
    owner: String,
    repo: String,
    data: SiteDataPush,
) -> Result<serde_json::Value, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;

    let files = vec![
        ("public/data/portfolio.json", &data.portfolio),
        ("public/data/config.json", &data.config),
        ("public/data/queue.json", &data.queue),
        ("public/data/pricing.json", &data.pricing),
    ];

    let mut updated = Vec::new();
    let mut errors = Vec::new();

    for (path, content) in &files {
        match create_or_update_file(
            &client, &pat, &owner, &repo, path, content,
            "StudioOS: atualizar dados do portfolio",
        ).await {
            Ok(()) => updated.push(path.to_string()),
            Err(e) => errors.push(e),
        }
    }

    if errors.is_empty() {
        let site_url = format!("https://{}.github.io/{}/", owner, repo);
        Ok(serde_json::json!({
            "success": true,
            "updated_files": updated,
            "site_url": site_url,
            "message": format!("{} arquivos atualizados. Site: {}", updated.len(), site_url)
        }))
    } else {
        Ok(serde_json::json!({
            "success": false,
            "updated_files": updated,
            "errors": errors,
            "message": format!("{} arquivos atualizados, {} erros", updated.len(), errors.len())
        }))
    }
}

#[command]
pub async fn github_get_repo_default_branch(
    pat: String,
    owner: String,
    repo: String,
) -> Result<String, String> {
    let client = build_client(&pat).map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{}/repos/{}/{}/branches/main", GITHUB_API, owner, repo))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if resp.status().is_success() {
        Ok("main".to_string())
    } else {
        let resp2 = client
            .get(format!("{}/repos/{}/{}/branches/master", GITHUB_API, owner, repo))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if resp2.status().is_success() {
            Ok("master".to_string())
        } else {
            Ok("main".to_string())
        }
    }
}

fn base64_encode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut result = String::new();
    let chunks: Vec<&[u8]> = bytes.chunks(3).collect();
    for chunk in chunks {
        let mut buf = [0u8; 3];
        for (i, &b) in chunk.iter().enumerate() {
            buf[i] = b;
        }
        let b0 = (buf[0] >> 2) & 0x3F;
        let b1 = ((buf[0] << 4) | (buf[1] >> 4)) & 0x3F;
        let b2 = ((buf[1] << 2) | (buf[2] >> 6)) & 0x3F;
        let b3 = buf[2] & 0x3F;

        const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        result.push(CHARS[b0 as usize] as char);
        result.push(CHARS[b1 as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[b2 as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[b3 as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

#![allow(dead_code)]

mod commands;
mod logger;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            logger::init_logging(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Logging
            commands::log::get_logs_cmd,
            commands::log::export_logs_cmd,
            commands::log::clear_logs_cmd,
            commands::log::get_session_id_cmd,
            commands::log::log_frontend_event,
            commands::log::get_log_stats,
            // Persistence
            commands::persistence::load_settings_cmd,
            commands::persistence::save_settings_cmd,
            commands::persistence::load_state_cmd,
            commands::persistence::save_state_cmd,
            commands::persistence::create_backup_cmd,
            commands::persistence::list_backups_cmd,
            commands::persistence::restore_backup_cmd,
            commands::persistence::delete_backup_cmd,
            commands::persistence::get_storage_info_cmd,
            // GitHub
            commands::github::github_check_pat,
            commands::github::github_list_repos,
            commands::github::github_get_repo,
            commands::github::github_list_workflows,
            commands::github::github_trigger_workflow,
            commands::github::github_list_workflow_runs,
            commands::github::github_get_file_content,
            commands::github::github_create_or_update_file,
            commands::github::github_delete_repo,
            commands::github::github_get_pages_info,
            commands::github::github_enable_pages,
            commands::github::github_push_site_data,
            commands::github::github_get_repo_default_branch,
            // Clients
            commands::clients::create_client_cmd,
            commands::clients::list_clients_cmd,
            commands::clients::get_client_cmd,
            commands::clients::update_client_cmd,
            commands::clients::delete_client_cmd,
            commands::clients::add_client_commission_cmd,
            commands::clients::get_client_commissions_cmd,
            commands::clients::get_client_history_cmd,
            // Image Compression
            commands::image_compress::compress_image,
            commands::image_compress::batch_compress_images,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

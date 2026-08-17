// SAGIM - Sistema Administrativo de Gimnasios
// Backend Tauri (Rust)

#[tauri::command]
fn print_page(webview: tauri::Webview) -> Result<(), String> {
    webview.print().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:sagim.db", vec![])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![print_page])
        .run(tauri::generate_context!())
        .expect("error while running SAGIM");
}

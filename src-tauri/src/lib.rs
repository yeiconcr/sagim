// SAGIM - Sistema Administrativo de Gimnasios
// Backend Tauri (Rust)

use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Executor;
use tauri_plugin_sql::{DbInstances, DbPool};

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
        .setup(|app| {
            // Reemplazar el pool creado por el plugin con uno configurado correctamente:
            // - max_connections(1): una sola conexión, las transacciones BEGIN/COMMIT
            //   van siempre al mismo hilo — elimina "database is locked"
            // - journal_mode=WAL: lectores no bloquean escritores
            // - busy_timeout=5000: esperar 5s antes de lanzar SQLITE_BUSY
            // - synchronous=NORMAL: balance seguridad/rendimiento en WAL
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                use tauri::Manager;

                // Resolver la ruta real del archivo (igual que hace el plugin)
                let app_config_dir = app_handle
                    .path()
                    .app_config_dir()
                    .expect("No se encontró el directorio de configuración");
                let db_path = app_config_dir.join("sagim.db");
                let db_url = format!("sqlite:{}", db_path.to_str().unwrap());

                // Crear pool con una sola conexión y PRAGMAs críticos
                let pool = SqlitePoolOptions::new()
                    .max_connections(1)
                    .after_connect(|conn, _meta| {
                        Box::pin(async move {
                            conn.execute("PRAGMA journal_mode=WAL").await?;
                            conn.execute("PRAGMA busy_timeout=5000").await?;
                            conn.execute("PRAGMA synchronous=NORMAL").await?;
                            conn.execute("PRAGMA foreign_keys=ON").await?;
                            Ok(())
                        })
                    })
                    .connect(&db_url)
                    .await
                    .expect("Error creando pool SQLite configurado");

                // Inyectar el pool en DbInstances del plugin, reemplazando el que creó el plugin.
                // El plugin usa la clave con la ruta completa al archivo.
                let db_instances = app_handle.state::<DbInstances>();
                let mut lock = db_instances.0.write().await;
                lock.insert(db_url, DbPool::Sqlite(pool));
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![print_page])
        .run(tauri::generate_context!())
        .expect("error while running SAGIM");
}

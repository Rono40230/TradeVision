use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager, Runtime};
use chrono::{Local, DateTime, Duration};

pub async fn create_backup<R: Runtime>(app_handle: AppHandle<R>) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("trading.db");
    
    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    let backup_dir = app_dir.join("backups");
    if !backup_dir.exists() {
        fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    }

    let now = Local::now();
    let filename = format!("trading_backup_{}.db", now.format("%Y%m%d_%H%M%S"));
    let backup_path = backup_dir.join(filename);

    fs::copy(&db_path, &backup_path).map_err(|e| e.to_string())?;
    
    // Retention policy: Keep only 30 days
    let _ = cleanup_old_backups(&backup_dir, 30);

    Ok(backup_path.to_string_lossy().into_owned())
}

fn cleanup_old_backups(dir: &Path, days: i64) -> Result<(), std::io::Error> {
    let threshold = Local::now() - Duration::days(days);
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Ok(metadata) = fs::metadata(&path) {
                if let Ok(modified) = metadata.modified() {
                    let dt: DateTime<Local> = modified.into();
                    if dt < threshold {
                        let _ = fs::remove_file(path);
                    }
                }
            }
        }
    }
    Ok(())
}

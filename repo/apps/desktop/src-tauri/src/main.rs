// no OS console window on release Windows builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_file(
    file_name: String,
    mime_type: String,
    data_base64: String,
    share: bool,
) -> Result<String, String> {
    let _ = mime_type;
    let _ = share;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("The file could not be decoded: {e}"))?;

    let downloads_dir = if let Ok(user_profile) = std::env::var("USERPROFILE") {
        PathBuf::from(user_profile).join("Downloads")
    } else if let Ok(home_dir) = std::env::var("HOME") {
        PathBuf::from(home_dir).join("Downloads")
    } else {
        std::env::current_dir().map_err(|e| format!("Could not resolve the default downloads folder: {e}"))?
    };

    let app_dir = downloads_dir.join("VajaBaki");
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Could not create the VajaBaki downloads folder: {e}"))?;

    let file_path = app_dir.join(file_name);
    fs::write(&file_path, bytes)
        .map_err(|e| format!("The file could not be saved: {e}"))?;

    Ok(file_path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use tauri::WebviewUrl;
use tauri::WebviewWindowBuilder;

/// Writes a file the web app generated (invoice PDF, Excel report, …) to the device's public
/// Downloads folder and optionally hands it to the share sheet. Returns the save location.
///
/// Android's WebView cannot download anything by itself: wry registers no `DownloadListener`,
/// so `<a download>` on a `blob:` URL is dropped silently, and the Web Share API isn't
/// implemented either. `apps/web/src/lib/file-delivery.ts` detects this shell and routes every
/// generated file through here instead.
#[tauri::command]
#[allow(unused_variables)]
async fn save_file(
    app: tauri::AppHandle,
    file_name: String,
    mime_type: String,
    data_base64: String,
    share: bool,
) -> Result<String, String> {
    #[cfg(target_os = "android")]
    {
        use base64::Engine as _;
        use tauri_plugin_android_fs::{AndroidFsExt, PublicGeneralPurposeDir};

        let bytes = base64::engine::general_purpose::STANDARD
            .decode(data_base64.as_bytes())
            .map_err(|e| format!("The file could not be decoded: {e}"))?;

        let api = app.android_fs_async();

        // No-op on Android 10+; only Android 9 and older actually prompt.
        if !api
            .public_storage()
            .request_permission()
            .await
            .map_err(|e| format!("Storage permission could not be requested: {e}"))?
        {
            return Err("Storage permission was denied, so the file could not be saved.".into());
        }

        let relative_path = format!("VajaBaki/{file_name}");
        let uri = api
            .public_storage()
            .write_new(
                None,
                PublicGeneralPurposeDir::Download,
                &relative_path,
                Some(mime_type.as_str()),
                &bytes,
            )
            .await
            .map_err(|e| format!("The file could not be saved: {e}"))?;

        if share {
            api.opener()
                .share_file(&uri)
                .await
                .map_err(|e| format!("The share sheet could not be opened: {e}"))?;
        }

        return Ok(format!("Download/{relative_path}"));
    }

    #[cfg(not(target_os = "android"))]
    {
        return Err("Saving files natively is only supported on Android.".into());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(target_os = "android")]
    let builder = builder.plugin(tauri_plugin_android_fs::init());

    builder
        .invoke_handler(tauri::generate_handler![save_file])
        .setup(|app| {
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://vajabaki.com/dashboard".parse().unwrap()),
            )
            .title("VajaBaki")
            .user_agent("VajaBakiMobile/1.0")
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

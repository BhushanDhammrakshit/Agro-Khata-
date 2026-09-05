use tauri::WebviewUrl;
use tauri::WebviewWindowBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://vajabaki.com/dashboard".parse().unwrap()),
            )
            .title("VajaBaki")
            .user_agent("VajaBakiMobile/1.0")
            // Android's WebView silently drops blob: URL downloads (PDF/Excel export) unless a
            // download handler is registered; returning true lets the OS Download Manager save it.
            .on_download(|_webview, _event| true)
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

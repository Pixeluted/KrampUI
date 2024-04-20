use tokio::fs;

#[tauri::command]
pub async fn create_directory(path: String) -> bool {
    fs::create_dir_all(&path).await.is_ok()
}

#[tauri::command]
pub async fn write_file(path: String, data: String) -> bool {
    fs::write(&path, &data).await.is_ok()
}

#[tauri::command]
pub async fn write_binary_file(path: String, data: Vec<u8>) -> bool {
    fs::write(&path, &data).await.is_ok()
}

#[tauri::command]
pub async fn delete_directory(path: String) -> bool {
    fs::remove_dir_all(&path).await.is_ok()
}

#[tauri::command]
pub async fn delete_file(path: String) -> bool {
    fs::remove_file(&path).await.is_ok()
}

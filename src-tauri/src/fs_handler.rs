use tokio::fs;
use std::path::PathBuf;

#[tauri::command]
pub async fn create_directory(path: String) -> (bool, Option<String>) {
    match fs::create_dir_all(&path).await {
        Ok(_) => (true, None),
        Err(err) => (false, Some(err.to_string())),
    }
}

#[tauri::command]
pub async fn write_file(path: String, data: String) -> (bool, Option<String>) {
    match fs::write(&path, &data).await {
        Ok(_) => (true, None),
        Err(err) => (false, Some(err.to_string())),
    }
}

#[tauri::command]
pub async fn write_binary_file(path: String, data: Vec<u8>) -> (bool, Option<String>) {
    match fs::write(&path, &data).await {
        Ok(_) => (true, None),
        Err(err) => (false, Some(err.to_string())),
    }
}

#[tauri::command]
pub async fn read_binary_file(path: String) -> Option<Result<Vec<u8>, String>> {
    match fs::read(&path).await {
        Ok(data) => Some(Ok(data)),
        Err(err) => Some(Err(err.to_string())),
    }
}

#[tauri::command]
pub async fn delete_directory(path: String) -> (bool, Option<String>) {
    match fs::remove_dir_all(&path).await {
        Ok(_) => (true, None),
        Err(err) => (false, Some(err.to_string())),
    }
}

#[tauri::command]
pub async fn delete_file(path: String) -> (bool, Option<String>) {
    match fs::remove_file(&path).await {
        Ok(_) => (true, None),
        Err(err) => (false, Some(err.to_string())),
    }
}

#[tauri::command]
pub async fn read_file(path: String) -> (bool, Option<String>) {
    match fs::read_to_string(&path).await {
        Ok(data) => (true, Some(data)),
        Err(err) => (false, Some(err.to_string())),
    }
}

#[tauri::command]
pub async fn rename_file(old_path: String, new_path: String) -> (bool, Option<String>) {
    match fs::rename(&old_path, &new_path).await {
        Ok(_) => (true, None),
        Err(err) => (false, Some(err.to_string())),
    }
}

#[tauri::command]
pub async fn open_file_explorer(path: String) {
    let path_arg = if PathBuf::from(&path).is_dir() {
        path
    } else {
        format!("/select,{}", path.replace("/", "\\"))
    };

    std::process::Command::new("explorer")
        .arg(path_arg)
        .spawn()
        .expect("Failed to open file explorer");
}

#[tauri::command]
pub fn get_exe_path() -> String {
    std::env::current_exe()
        .expect("Failed to get current exe path")
        .display()
        .to_string()
}

#[tauri::command]
pub async fn exists(path: String) -> bool {
    fs::metadata(&path).await.is_ok()
}
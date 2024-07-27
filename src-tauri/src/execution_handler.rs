use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;

#[tauri::command]
pub async fn execute_script(script: String) -> Result<(), String> {
    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;
    path.push("bin");
    path.push("scheduler");
    fs::create_dir_all(&path).await.map_err(|e| e.to_string())?;
    
    path.push("code.txt");

    let final_content = script + "@@FileFullyWritten@@";
    println!("{}", path.to_string_lossy());
    
    let mut file = File::create(path).await.map_err(|e| e.to_string())?;
    file.write_all(final_content.as_bytes()).await.map_err(|e| e.to_string())?;
    
    Ok(())
}
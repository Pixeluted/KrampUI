use tokio::{fs::File, io::AsyncReadExt};


#[tauri::command]
pub async fn validate_executable(executable_path: String) -> (bool, String) {
    let mut file = match File::open(executable_path).await {
        Ok(file) => file,
        Err(_) => return (false, "Failed to open file!".to_string()),
    };
    let mut buffer = Vec::new();
    match file.read_to_end(&mut buffer).await {
        Ok(_) => {}
        Err(_) => return (false, "Failed to read executable".to_string()),
    };
    let min_length = 4;
    let mut current_string = Vec::new();
    let mut strings_found: Vec<String> = Vec::new();
    for &byte in &buffer {
        if byte.is_ascii_graphic() || byte == b' ' {
            current_string.push(byte);
        } else {
            if current_string.len() >= min_length {
                if let Ok(string) = String::from_utf8(current_string.clone()) {
                    strings_found.push(string);
                }
            }
            current_string.clear();
        }
    }
    let string_to_check_for = "Authentication failed: %d".to_string();
    if strings_found.contains(&string_to_check_for) {
        (true, "".to_string())
    } else {
        (false, "This isn't the Ro-Exec Loader, download it from acedia.".to_string())
    }
}
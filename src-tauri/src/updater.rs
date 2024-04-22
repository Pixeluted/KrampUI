use std::{ffi::OsString, process::{exit, Command}, time::Duration};
use serde_json::Value;
use tokio::{fs::{self, File}, io::AsyncWriteExt};
use win_msgbox::{w, Okay, YesNo};
use std::os::windows::ffi::OsStrExt;

async fn get_latest_release() -> Option<(String, String)> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.github.com/repos/Pixeluted/KrampUI/releases/latest")
        .header("User-Agent", "KrampUI")
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        return None;
    }

    let json: Value = response.json().await.ok()?;
    let version = json.get("tag_name")?.as_str()?.replace("v", "");
    let release = json.get("html_url")?.as_str()?.to_string();

    return Some((version, release));
}


#[tauri::command]
pub async fn check_for_updates(auto_update_enabled: bool) {
    if let Some((latest_version, _link)) = get_latest_release().await {
        let current_version = env!("CARGO_PKG_VERSION");

        let latest_version_number = match latest_version.replace(".", "").parse::<i32>() {
            Ok(number) => Some(number),
            Err(_) => None,
        };

        let current_version_number = match current_version.replace(".", "").parse::<i32>() {
            Ok(number) => Some(number),
            Err(_) => None,
        };

        if latest_version_number.is_some()
            && current_version_number.is_some()
            && latest_version_number.unwrap() > current_version_number.unwrap()
        {
            if auto_update_enabled == true {
                start_updater().await;
                return;
            }

            let message = format!(
                "Would you like to update?\nYou are on v{}, the latest is v{}.",
                current_version, latest_version
            );
            let wide_message: Vec<u16> = OsString::from(&message)
                .encode_wide()
                .chain(Some(0))
                .collect();
            let response = win_msgbox::information::<YesNo>(wide_message.as_ptr())
                .title(w!("KrampUI"))
                .show()
                .unwrap();

            if response == YesNo::Yes {
                start_updater().await;
                return;
            }
        }
    }
}

async fn start_updater() {
    let krampui_updater_exe: &[u8] = include_bytes!("../binaries/krampui-updater.exe");
    let executable_directory = std::env::current_dir().unwrap();
    let target_updater_path = executable_directory.join("krampui-updater.exe");
    
    let mut file = match File::create(&target_updater_path).await {
        Ok(file) => file,
        Err(err) => { println!("Error when trying to open the file for updater: {}", err.to_string()); return; }
    };

    match file.write_all(krampui_updater_exe).await {
        Ok(_) => {},
        Err(err) => { println!("Error when trying to write the updater: {}", err.to_string()); return; }
    }

    match file.flush().await {
        Ok(_) => {},
        Err(err) => { println!("Error when trying to flush the updater: {}", err.to_string()); return; }
    }

    drop(file);
    while !target_updater_path.exists() {
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    match Command::new(&target_updater_path).spawn() {
        Ok(child) => child,
        Err(err) => { println!("Failed to start the updater: {}", err); return; }
    };
    exit(0);
}

pub async fn check_for_pending_update() {
    let updater_path = std::env::current_dir().unwrap().join("krampui-updater.exe");

    match fs::try_exists(&updater_path).await {
        Ok(exists) => {
            if exists == true {
                fs::remove_file(updater_path).await.ok();
                let message = "Sucessfully updated!";
                let wide_message: Vec<u16> = OsString::from(&message)
                    .encode_wide()
                    .chain(Some(0))
                    .collect();
                win_msgbox::information::<Okay>(wide_message.as_ptr())
                    .title(w!("KrampUI"))
                    .show()
                    .ok();
            }   
        },
        Err(_) => {}
    }
}
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod websocket_handler;
use crate::websocket_handler::initialize_websocket;
use crate::websocket_handler::execute_script;

use colored::{control, ColoredString, Colorize};
use lazy_static::lazy_static;
use rdev::{listen, Event, EventType};
use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use std::ffi::OsString;
use std::os::windows::ffi::OsStrExt;
use std::sync::{Arc, Mutex};
use std::{
    thread::{self, sleep},
    time::Duration,
};
use sysinfo::System;
use tauri::{
    command, generate_context, generate_handler, Builder, CustomMenuItem, Manager, SystemTray,
    SystemTrayEvent, SystemTrayMenu, Window, WindowEvent,
};
use tokio::{
    fs::{self, File},
    io::AsyncReadExt,
};
use win_msgbox::{w, YesNo};

#[derive(Clone, Serialize)]
struct Payload {
    message: String,
}

#[derive(Clone, Serialize)]
struct PayloadUpdate {
    message: bool,
}

#[derive(Clone, Serialize)]
struct Payload2 {
    args: Vec<String>,
    cwd: String,
}

#[command]
fn kill_roblox() -> bool {
    return match System::new_all()
        .processes_by_name("RobloxPlayerBeta.exe")
        .next()
    {
        Some(process) => process.kill(),
        _ => false,
    };
}

#[command]
fn is_roblox_running() -> bool {
    return System::new_all()
        .processes_by_name("RobloxPlayerBeta.exe")
        .next()
        .is_some();
}

async fn get_latest_release() -> Option<(String, String)> {
    let client = Client::new();
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

#[command]
async fn create_directory(path: String) -> bool {
    fs::create_dir_all(&path).await.is_ok()
}

#[command]
async fn write_file(path: String, data: String) -> bool {
    fs::write(&path, &data).await.is_ok()
}

#[command]
async fn write_binary_file(path: String, data: Vec<u8>) -> bool {
    fs::write(&path, &data).await.is_ok()
}

#[command]
async fn delete_directory(path: String) -> bool {
    fs::remove_dir_all(&path).await.is_ok()
}

#[command]
async fn delete_file(path: String) -> bool {
    fs::remove_file(&path).await.is_ok()
}

lazy_static! {
    static ref KEY_EVENTS_INITIALIZED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

#[command]
fn init_key_events(window: Window) {
    let mut key_events_initialized = KEY_EVENTS_INITIALIZED.lock().unwrap();

    if *key_events_initialized {
        return;
    }

    *key_events_initialized = true;
    thread::spawn(move || {
        let callback = move |event: Event| {
            if let EventType::KeyRelease(key) = event.event_type {
                window
                    .emit(
                        "key-press",
                        Payload {
                            message: format!("{:?}", key),
                        },
                    )
                    .unwrap();
            }
        };

        listen(callback).unwrap();
    });
}

#[command]
fn log(message: String, _type: Option<String>) {
    let prefix: Option<ColoredString> = match _type {
        Some(_type) => match _type.as_str() {
            "info" => Some("[ INFO ]".cyan()),
            "success" => Some("[  OK  ]".green()),
            "warn" => Some("[ WARN ]".yellow()),
            "error" => Some("[ FAIL ]".red()),
            _ => None,
        },
        None => None,
    };

    if let Some(prefix) = prefix {
        println!("{} {}", prefix, message);
    } else {
        println!("{}", message);
    }
}

#[command]
async fn validate_executable(executable_path: String) -> (bool, String) {
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

#[tokio::main]
async fn main() {
    control::set_virtual_terminal(true).ok();

    if let Some((latest_version, link)) = get_latest_release().await {
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
                open::that(link).unwrap();
                return;
            }
        }
    }

    let toggle = CustomMenuItem::new("toggle".to_string(), "Toggle");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray = SystemTrayMenu::new().add_item(toggle).add_item(quit);

    Builder::default()
        .on_window_event(|e| {
            if let WindowEvent::Resized(_) = e.event() {
                sleep(Duration::from_millis(5));
            }
        })
        .system_tray(SystemTray::new().with_menu(tray))
        .on_system_tray_event(|app, e| match e {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                let window = app.get_window("main").unwrap();

                match id.as_str() {
                    "toggle" => window
                        .emit(
                            "toggle",
                            Payload {
                                message: "".to_string(),
                            },
                        )
                        .unwrap(),
                    "quit" => window
                        .emit(
                            "exit",
                            Payload {
                                message: "".to_string(),
                            },
                        )
                        .unwrap(),
                    _ => {}
                }
            }
            _ => {}
        })
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            app.emit_all("single-instance", Payload2 { args: argv, cwd })
                .unwrap();
        }))
        .invoke_handler(generate_handler![
            initialize_websocket,
            execute_script,
            init_key_events,
            is_roblox_running,
            kill_roblox,
            log,
            create_directory,
            write_file,
            write_binary_file,
            delete_directory,
            delete_file,
            validate_executable
        ])
        .run(generate_context!())
        .expect("Failed to launch application.");
}

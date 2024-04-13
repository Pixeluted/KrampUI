#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use tauri::{command, generate_context, generate_handler, Builder, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, Window, WindowEvent};
use std::{thread::{self, sleep}, time::Duration};
use std::sync::{Arc, Mutex};
use std::ffi::OsString;
use std::os::windows::ffi::OsStrExt;
use rdev::{listen, Event, EventType};
use lazy_static::lazy_static;
use reqwest::Client;
use colored::{Colorize, ColoredString, control};
use win_msgbox::{w, YesNo};
use serde::Serialize;
use sysinfo::System;
use tokio::{fs::{self, File}, io::AsyncReadExt};

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
    return match System::new_all().processes_by_name("RobloxPlayerBeta.exe").next() {
        Some(process) => process.kill(),
        _ => false
    };
}

#[command]
fn is_roblox_running() -> bool {
    return System::new_all().processes_by_name("RobloxPlayerBeta.exe").next().is_some();
}

async fn get_latest_release() -> Option<(String, String)> {
    let client = Client::new();
    let response = client.get("https://api.github.com/repos/BitdancerStudios/KrampUI/releases/latest")
        .header("User-Agent", "KrampUI")
        .timeout(Duration::from_secs(5))
        .send()
        .await;

    return match response {
        Ok(response) =>  match response.status().is_success() {
            true => {
                let json: Value = match response.json().await {
                    Ok(json) => json,
                    Err(_) => return None
                };

                let version = match json.get("tag_name") {
                    Some(version) => match version.as_str() {
                        Some(version) => version.replace("v", ""),
                        None => return None
                    },
                    None => return None
                };

                let release = match json.get("html_url") {
                    Some(release) => match release.as_str() {
                        Some(release) => release.to_string(),
                        None => return None
                    },
                    None => return None
                };

                return Some((version, release));
            },
            false => None
        },
        Err(_) => None
    };
}

#[command]
async fn create_directory(path: String) -> bool {
    return match fs::create_dir_all(&path).await {
        Ok(_) => true,
        Err(_) => false
    };
}

#[command]
async fn write_file(path: String, data: String) -> bool {
    return match fs::write(&path, &data).await {
        Ok(_) => true,
        Err(_) => false
    };
}

#[command]
async fn delete_directory(path: String) -> bool {
    return match fs::remove_dir_all(&path).await {
        Ok(_) => true,
        Err(_) => false
    };
}

#[command]
async fn delete_file(path: String) -> bool {
    return match fs::remove_file(&path).await {
        Ok(_) => true,
        Err(_) => false
    };
}

lazy_static! {
    static ref CONNECTED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref KEY_EVENTS_INITIALIZED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref WEBSOCKET_INITIALIZED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref WEBSOCKET: Arc<Mutex<Option<ws::Sender>>> = Arc::new(Mutex::new(None));
}

#[command]
fn init_key_events(window: Window) {
    let mut key_events_initialized = KEY_EVENTS_INITIALIZED.lock().unwrap();

    if !*key_events_initialized {
        *key_events_initialized = true;
        
        thread::spawn(move || {
            let callback = move | event: Event | {
                if let EventType::KeyRelease(key) = event.event_type {
                    window.emit("key-press", Payload { message: format!("{:?}", key) }).unwrap();
                }
            };

            listen(callback).unwrap();
        });
    }
}

#[command]
fn init_websocket(window: Window, port: u16) {
    let mut websocket_initialized = WEBSOCKET_INITIALIZED.lock().unwrap();

    if !*websocket_initialized {
        *websocket_initialized = true;

        struct Server {
            window: Window
        }

        impl ws::Handler for Server {
            fn on_message(&mut self, data: ws::Message) -> ws::Result<()> {
                let mut connected = CONNECTED.lock().unwrap();
                
                if *connected {
                    return Ok(());
                }

                let data_string = data.to_string();
                let mut parts = data_string.split(",");
                let type_value = match parts.next() {
                    Some(val) => val.trim(),
                    None => return Ok(())
                };

                if type_value == "connect" {
                    self.window.emit("update", PayloadUpdate { message: true }).unwrap();
                    *connected = true;
                }

                return Ok(());
            }

            fn on_close(&mut self, _code: ws::CloseCode, _reason: &str) {
                let mut connected = CONNECTED.lock().unwrap();

                if *connected {
                    self.window.emit("update", PayloadUpdate { message: false }).unwrap();
                    *connected = false;
                }
            }
        }

        thread::spawn(move || {
            ws::listen(format!("127.0.0.1:{}", port), move | out: ws::Sender | { 
                let cloned_window = window.clone();
                *WEBSOCKET.lock().unwrap() = Some(out.clone());
                return Server { window: cloned_window };
            }).ok();
        });

        thread::spawn(move || {
            loop {
                if let Some(websocket) = WEBSOCKET.lock().unwrap().clone() {
                    websocket.send("kr-ping").unwrap();
                }

                sleep(Duration::from_millis(250));
            };
        });
    }
}

#[command]
fn execute_script(text: &str) {    
    if let Some(websocket) = WEBSOCKET.lock().unwrap().clone() {
        websocket.send(text).unwrap();
    }
}

#[command]
fn log(message: String, _type: Option<String>) {
    let prefix: Option<ColoredString> = match _type {
        Some(_type) => match _type.as_str() {
            "info" => Some("[ INFO ]".cyan()),
            "success" => Some("[  OK  ]".green()),
            "warn" => Some("[ WARN ]".yellow()),
            "error" => Some("[ FAIL ]".red()),
            _ => None
        },
        None => None
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
        Err(_) => return (false, "Failed to open file!".to_string())
    };

    let mut buffer = Vec::new();

    match file.read_to_end(&mut buffer).await {
        Ok(_) => {},
        Err(_) => return (false, "Failed to read executable".to_string())
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
        (false, "This is not krampus loader.".to_string())
    }
}

#[tokio::main]
async fn main() {
    control::set_virtual_terminal(true).ok();

    if let Some((latest_version, link)) = get_latest_release().await {
        let current_version = env!("CARGO_PKG_VERSION");

        let latest_version_number = match latest_version.replace(".", "").parse::<i32>() {
            Ok(number) => Some(number),
            Err(_) => None
        };

        let current_version_number = match current_version.replace(".", "").parse::<i32>() {
            Ok(number) => Some(number),
            Err(_) => None
        };

        if latest_version_number.is_some() && current_version_number.is_some() && latest_version_number.unwrap() > current_version_number.unwrap() {
            let message = format!("Would you like to update?\nYou are on v{}, the latest is v{}.", current_version, latest_version);
            let wide_message: Vec<u16> = OsString::from(&message).encode_wide().chain(Some(0)).collect();
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
        .on_system_tray_event(| app, e | match e {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                let window = app.get_window("main").unwrap();
                
                match id.as_str() {
                    "toggle" => window.emit("toggle", Payload { message: "".to_string() }).unwrap(),
                    "quit" => window.emit("exit", Payload { message: "".to_string() }).unwrap(),
                    _ => {}
                }
            }
            _ => {}
          })
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            app.emit_all("single-instance", Payload2 { args: argv, cwd }).unwrap();
        }))
        .invoke_handler(generate_handler![
            init_websocket,
            init_key_events,
            execute_script,
            is_roblox_running,
            kill_roblox,
            log,
            create_directory,
            write_file,
            delete_directory,
            delete_file,
            validate_executable
        ])
        .run(generate_context!())
        .expect("Failed to launch application.");
}
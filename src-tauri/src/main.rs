#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use regex::Regex;
use serde_json::{json, Value};
use tauri::{command, generate_context, generate_handler, Builder, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, Window, WindowEvent};
use std::{fs::File, io::copy, sync::{Arc, Mutex}};
use std::{thread::{self, sleep}, time::Duration};
use rdev::{listen, Event, EventType};
use lazy_static::lazy_static;
use reqwest::blocking::get;
use sysinfo::System;

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

#[derive(Clone, serde::Serialize)]
struct PayloadUpdate {
  message: bool,
}

#[derive(Clone, serde::Serialize)]
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

#[command]
fn download_executable(window: Window, path: &str, token: &str) -> bool {
    return match get(format!("https://api.acedia.gg/download?product=RO-EXEC&login_token={}", token)) {
        Ok(mut response) => {
            let app_dir = window.app_handle().path_resolver().app_config_dir().unwrap();
            let path = app_dir.join(path);

            return match File::create(path) {
                Ok(mut dest) => match copy(&mut response, &mut dest) {
                    Ok(_) => true,
                    Err(_) => false
                },
                Err(_) => false
            };
        },
        Err(_) => false
    };
}

#[command]
async fn attempt_login(_window: Window, email: String, password: String) -> (bool, String) {
    let json_body = json!({
        "0": {
            "json": {
                "emailOrUsername": email,
                "password": password
            }
        }
    }).to_string();

    let client = reqwest::Client::new();
    let login_request = client.post("https://api.acedia.gg/trpc/auth.logIn?batch=1")
        .body(json_body)
        .header("Content-Type", "application/json")
        .send()
        .await;

    match login_request {
        Ok(login_response) => {
            if login_response.status().is_success() {
                let set_cookie_header = login_response.headers().get("Set-Cookie")
                    .and_then(|value| value.to_str().ok())
                    .unwrap_or("Not found");

                let re = Regex::new(r"_session=([^;]+)").unwrap();
                match re.captures(set_cookie_header) {
                    Some(caps) => {
                        if let Some(matched) = caps.get(1) {
                            (true, matched.as_str().to_string())
                        } else {
                            (false, "Failed to extract session token!".to_string())
                        }
                    },
                    None => {
                        (false, "Failed to extract session token!".to_string())
                    },
                }
            } else {
                (false, "Invalid credentials".to_string())
            }
        },
        Err(err) => {
            println!("Failed to send request: {}", err.to_string());
            (false, "Failed to send request".to_string())
        }
    }
}

#[command]
async fn get_login_token(_window: Window, session_token: String) -> (bool, String) {
    let client = reqwest::Client::new();
    let url = "https://api.acedia.gg/trpc/user.current.get?batch=1&input={\"0\":{\"json\":null,\"meta\":{\"values\":[\"undefined\"]}}}";
    let user_info_request = client.get(url)
        .header("Authorization", format!("Bearer {}", session_token))
        .send()
        .await;

    match user_info_request {
        Ok(user_response) => {
            if user_response.status().is_success() {
                let parsed_json: Value = match user_response.json().await {
                    Ok(json) => json,
                    Err(err) => return (false, err.to_string())
                };

                let first_element = match parsed_json.get(0) {
                    Some(elem) => elem,
                    None => return (false, "Invalid JSON Response".to_string())
                };

                let result_element = match first_element.get("result") {
                    Some(elem) => elem,
                    None => return (false, "Invalid JSON Response".to_string())
                };

                let data_element = match result_element.get("data") {
                    Some(elem) => elem,
                    None => return (false, "Invalid JSON Response".to_string())
                };

                let user_data = match data_element.get("json") {
                    Some(elem) => elem,
                    None => return (false, "Invalid JSON Response".to_string())
                };

                let login_token = match user_data.get("token") {
                    Some(elem) => elem.as_str().unwrap(),
                    None => return (false, "Invalid JSON Response".to_string())
                };

                (true, login_token.to_string())
            } else {
                (false, "Invalid authentication!".to_string())
            }
        },
        Err(err) => {
            println!("Sending request failed: {}", err.to_string());
            (false, err.to_string())
        }
    }
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
                let type_value = parts.next().unwrap().trim();

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
    }
}

#[command]
fn execute_script(text: &str) {    
    if let Some(websocket) = WEBSOCKET.lock().unwrap().clone() {
        websocket.send(text).unwrap();
    }
}

#[command]
fn log(message: String) {
    println!("[FRONTEND] {}", message);
}

fn main() {
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
        .invoke_handler(generate_handler![init_websocket, init_key_events, execute_script, is_roblox_running, kill_roblox, download_executable, log, attempt_login, get_login_token])
        .run(generate_context!())
        .expect("Failed to launch application.");
}
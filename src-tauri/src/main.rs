#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayMenu, WindowEvent};
use std::{thread::sleep, time::Duration};

mod key_events;
use crate::key_events::init_key_events;

mod processes;
use crate::processes::kill_roblox;
use crate::processes::start_roblox_check_loop;

mod fs_handler;
use crate::fs_handler::create_directory;
use crate::fs_handler::delete_directory;
use crate::fs_handler::delete_file;
use crate::fs_handler::write_binary_file;
use crate::fs_handler::write_file;
use crate::fs_handler::read_file;
use crate::fs_handler::exists;

#[derive(Clone, Serialize)]
struct SingleInstancePayload {
    args: Vec<String>,
    cwd: String,
}

#[tokio::main]
async fn main() {
    let toggle = CustomMenuItem::new("toggle".to_string(), "Toggle");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray = SystemTrayMenu::new().add_item(toggle).add_item(quit);

    tauri::Builder::default()
        .on_window_event(|e| {
            if let WindowEvent::Resized(_) = e.event() {
                sleep(Duration::from_millis(5));
            }
        })
        .system_tray(SystemTray::new().with_menu(tray))
        .on_system_tray_event(|app, event| {
            match event {
                tauri::SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "toggle" => {
                            app.emit_all("toggle", ()).unwrap();
                        }
                        "quit" => {
                            app.emit_all("quit", ()).unwrap();
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            app.emit_all("single-instance", SingleInstancePayload { args: argv, cwd })
                .unwrap();
        }))
        .invoke_handler(tauri::generate_handler![
            create_directory,
            delete_directory,
            delete_file,
            write_binary_file,
            write_file,
            read_file,
            exists,
            kill_roblox,
            start_roblox_check_loop,
            init_key_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

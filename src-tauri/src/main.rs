#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use colored::{control, ColoredString, Colorize};
use serde::Serialize;
use std::{
    thread::sleep,
    time::Duration,
};
use tauri::{
    command, generate_context, generate_handler, Builder, CustomMenuItem, Manager, SystemTray,
    SystemTrayEvent, SystemTrayMenu, WindowEvent,
};

mod websocket_handler;
use crate::websocket_handler::initialize_websocket;
use crate::websocket_handler::execute_script;

mod fs_handler;
use crate::fs_handler::create_directory;
use crate::fs_handler::delete_directory;
use crate::fs_handler::delete_file;
use crate::fs_handler::write_binary_file;
use crate::fs_handler::write_file;

mod processes;
use crate::processes::is_roblox_running;
use crate::processes::kill_roblox;

mod key_events;
use crate::key_events::init_key_events;

mod loader;
use crate::loader::validate_executable;

mod updater;
use crate::updater::check_for_pending_update;
use crate::updater::check_for_updates;

#[derive(Clone, Serialize)]
struct WindowUpdate {
    message: String,
}

#[derive(Clone, Serialize)]
struct SingleInstancePayload {
    args: Vec<String>,
    cwd: String,
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

#[tokio::main]
async fn main() {
    control::set_virtual_terminal(true).ok();

    check_for_pending_update().await;

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
                            WindowUpdate {
                                message: "".to_string(),
                            },
                        )
                        .unwrap(),
                    "quit" => window
                        .emit(
                            "exit",
                            WindowUpdate {
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
            app.emit_all("single-instance", SingleInstancePayload { args: argv, cwd })
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
            validate_executable,
            check_for_updates
        ])
        .run(generate_context!())
        .expect("Failed to launch application.");
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, Manager, AppHandle, Window, Builder, WindowEvent, SystemTray, CustomMenuItem, SystemTrayMenu, SystemTrayEvent, generate_context, generate_handler};
use std::{thread::{self, sleep}, time::Duration, process};
use std::sync::atomic::{AtomicBool, Ordering};
use rdev::{listen, Event, EventType};
use sysinfo::System;

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

#[derive(Clone, serde::Serialize)]
struct Payload2 {
  args: Vec<String>,
  cwd: String,
}

#[command]
fn kill_process(name: &str) -> bool {
    return match System::new_all().processes_by_name(&name).next() {
        Some(process) => process.kill(),
        _ => false
    };
}

#[command]
fn is_process_running(name: &str) -> bool {
    return System::new_all().processes_by_name(&name).next().is_some();
}

static KEY_EVENTS_INITIALIZED: AtomicBool = AtomicBool::new(false);

#[command]
fn init_key_events(window: Window) {
    if !KEY_EVENTS_INITIALIZED.load(Ordering::Relaxed) {
        KEY_EVENTS_INITIALIZED.store(true, Ordering::Relaxed);
        
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
fn eval(app: AppHandle, name: &str, code: &str) -> bool {
    return match app.get_window(name) {
        Some(window) => match window.eval(code) {
            Ok(_) => true,
            Err(_) => false
        },
        None => false
    };
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray = SystemTrayMenu::new().add_item(quit);

    Builder::default()
        .on_window_event(|e| {
            if let WindowEvent::Resized(_) = e.event() {
                sleep(Duration::from_millis(5));
            }
        })
        .system_tray(SystemTray::new().with_menu(tray))
        .on_system_tray_event(| _, e | match e {
            SystemTrayEvent::MenuItemClick { id, .. } => {
              match id.as_str() {
                "quit" => process::exit(0),
                _ => {}
              }
            }
            _ => {}
          })
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            app.emit_all("single-instance", Payload2 { args: argv, cwd }).unwrap();
        }))
        .invoke_handler(generate_handler![init_key_events, is_process_running, kill_process, eval])
        .run(generate_context!())
        .expect("Failed to launch application.");
}
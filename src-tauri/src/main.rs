#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, Window, Builder, WindowEvent, generate_context, generate_handler};
use std::{thread::{self, sleep}, time::Duration};
use std::sync::atomic::{AtomicBool, Ordering};
use rdev::{listen, Event, EventType};
use sysinfo::System;

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
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

fn main() {
    Builder::default()
        .on_window_event(|e| {
            if let WindowEvent::Resized(_) = e.event() {
                sleep(Duration::from_millis(5));
            }
        })
        .invoke_handler(generate_handler![init_key_events, is_process_running, kill_process])
        .run(generate_context!())
        .expect("Failed to launch application.");
}
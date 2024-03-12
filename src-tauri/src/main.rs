#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, Builder, WindowEvent, generate_context, generate_handler};
use std::{thread::sleep, time::Duration};
use sysinfo::System;

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

fn main() {
    Builder::default()
        .on_window_event(|e| {
            if let WindowEvent::Resized(_) = e.event() {
                sleep(Duration::from_millis(5));
            }
        })
        .invoke_handler(generate_handler![is_process_running, kill_process])
        .run(generate_context!())
        .expect("Failed to launch application.");
}
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, Builder, generate_context, generate_handler};
use sysinfo::System;

#[command]
fn is_process_running(name: &str) -> bool {
    let system = System::new_all();
    return system.processes_by_name(&name).next().is_some();
}

fn main() {
    Builder::default()
        .invoke_handler(generate_handler![is_process_running])
        .run(generate_context!())
        .expect("Failed to launch application.");
}
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Builder, generate_context, generate_handler};

fn main() {
    Builder::default()
        .invoke_handler(generate_handler![])
        .run(generate_context!())
        .expect("Failed to launch application.");
}
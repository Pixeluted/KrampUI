use serde::Serialize;
use sysinfo::System;

#[derive(Clone, Serialize)]
struct RobloxInstanceUpdatePlayload {
    instances: Vec<u32>
}

#[tauri::command]
pub fn kill_roblox() -> bool {
    return match System::new_all()
        .processes_by_name("RobloxPlayerBeta.exe")
        .next()
    {
        Some(process) => process.kill(),
        _ => false,
    };
}

#[tauri::command]
pub fn start_roblox_check_loop(window: tauri::Window) {
    tokio::spawn(async move {
        let mut previous_roblox_instances: Vec<u32> = vec![];

        loop {
            let current_roblox_instances = System::new_all()
                .processes_by_name("RobloxPlayerBeta.exe")
                .map(|process| process.pid().as_u32())
                .collect::<Vec<u32>>();

            if previous_roblox_instances != current_roblox_instances {
                window.emit("instances-update", RobloxInstanceUpdatePlayload { instances: current_roblox_instances.clone() }).unwrap();
                previous_roblox_instances = current_roblox_instances.clone();
            }

            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    });
}
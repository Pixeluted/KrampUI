use sysinfo::System;


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
pub fn is_roblox_running() -> bool {
    return System::new_all()
        .processes_by_name("RobloxPlayerBeta.exe")
        .next()
        .is_some();
}
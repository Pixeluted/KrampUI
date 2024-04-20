use lazy_static::lazy_static;
use rdev::{listen, Event, EventType};
use serde::Serialize;
use std::{
    sync::{Arc, Mutex},
    thread,
};

#[derive(Clone, Serialize)]
struct KeyPressPayload {
    message: String,
}

lazy_static! {
    static ref KEY_EVENTS_INITIALIZED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

#[tauri::command]
pub fn init_key_events(window: tauri::Window) {
    let mut key_events_initialized = KEY_EVENTS_INITIALIZED.lock().unwrap();

    if *key_events_initialized {
        return;
    }

    *key_events_initialized = true;
    thread::spawn(move || {
        let callback = move |event: Event| {
            if let EventType::KeyRelease(key) = event.event_type {
                window
                    .emit(
                        "key-press",
                        KeyPressPayload {
                            message: format!("{:?}", key),
                        },
                    )
                    .unwrap();
            }
        };

        listen(callback).unwrap();
    });
}

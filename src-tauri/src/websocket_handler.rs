use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Mutex,
    },
    thread,
};

use lazy_static::lazy_static;
use serde::Serialize;

struct WebsocketConnection {
    ws_sender: ws::Sender,
    ws_id: usize,
    window: tauri::Window,
}

#[derive(Clone, Serialize)]
struct WebsocketCountUpdate {
    websocket_count_update: bool,
    new_count: usize,
}

lazy_static! {
    static ref WEBSOCKET_CONNECTIONS: Arc<Mutex<HashMap<usize, ws::Sender>>> =
        Arc::new(Mutex::new(HashMap::new()));
    static ref WEBSOCKET_INITIALIZED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref NEXT_ID: AtomicUsize = AtomicUsize::new(1);
}

impl ws::Handler for WebsocketConnection {
    fn on_open(&mut self, _shake: ws::Handshake) -> ws::Result<()> {
        let mut connections = WEBSOCKET_CONNECTIONS.lock().unwrap();
        self.ws_id = NEXT_ID.fetch_add(1, Ordering::Relaxed);

        connections.insert(self.ws_id, self.ws_sender.clone());
        println!(
            "New connection received! ID {} has been assigned to it!",
            self.ws_id
        );

        self.window
            .emit(
                "websocket-update",
                WebsocketCountUpdate {
                    websocket_count_update: true,
                    new_count: connections.len(),
                },
            )
            .ok();

        Ok(())
    }

    fn on_message(&mut self, msg: ws::Message) -> ws::Result<()> {
        let data_string = msg.to_string();

        println!(
            "Received message from websocket {}: {}",
            self.ws_id, data_string
        );

        Ok(())
    }

    fn on_close(&mut self, code: ws::CloseCode, reason: &str) {
        let mut connections = WEBSOCKET_CONNECTIONS.lock().unwrap();
        connections.remove(&self.ws_id);

        println!("Connection {} closed: {:?} {}", self.ws_id, code, reason);

        self.window
            .emit(
                "websocket-update",
                WebsocketCountUpdate {
                    websocket_count_update: true,
                    new_count: connections.len(),
                },
            )
            .ok();
    }
}

#[tauri::command]
pub async fn execute_script(script: String) {
    let connections = WEBSOCKET_CONNECTIONS.lock().unwrap();

    if connections.len() > 0 {
        // Once multi inject is supported, we will get argument like the user id of the target instance, right now we are just going to use first WS
        let (_ws_id, websocket) = connections.iter().next().unwrap();
        websocket.send(script).unwrap();
    }
}

#[tauri::command]
pub async fn initialize_websocket(port: u16, window: tauri::Window) {
    thread::spawn(move || {
        ws::listen(format!("127.0.0.1:{}", port), move |out: ws::Sender| {
            WebsocketConnection {
                ws_sender: out,
                ws_id: 0,
                window: window.clone(),
            }
        })
        .ok();
    });

    println!("Websocket initialiazed!");
}

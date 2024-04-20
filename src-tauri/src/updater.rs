use reqwest::Client;
use serde_json::Value;
use std::os::windows::ffi::OsStrExt;
use std::{ffi::OsString, time::Duration};
use win_msgbox::{w, YesNo};

async fn get_latest_release() -> Option<(String, String)> {
    let client = Client::new();
    let response = client
        .get("https://api.github.com/repos/Pixeluted/KrampUI/releases/latest")
        .header("User-Agent", "KrampUI")
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .ok()?;

    if !response.status().is_success() {
        return None;
    }

    let json: Value = response.json().await.ok()?;
    let version = json.get("tag_name")?.as_str()?.replace("v", "");
    let release = json.get("html_url")?.as_str()?.to_string();

    return Some((version, release));
}

pub async fn check_for_update() {
    if let Some((latest_version, link)) = get_latest_release().await {
        let current_version = env!("CARGO_PKG_VERSION");

        let latest_version_number = match latest_version.replace(".", "").parse::<i32>() {
            Ok(number) => Some(number),
            Err(_) => None,
        };

        let current_version_number = match current_version.replace(".", "").parse::<i32>() {
            Ok(number) => Some(number),
            Err(_) => None,
        };

        if latest_version_number.is_some()
            && current_version_number.is_some()
            && latest_version_number.unwrap() > current_version_number.unwrap()
        {
            let message = format!(
                "Would you like to update?\nYou are on v{}, the latest is v{}.",
                current_version, latest_version
            );
            let wide_message: Vec<u16> = OsString::from(&message)
                .encode_wide()
                .chain(Some(0))
                .collect();
            let response = win_msgbox::information::<YesNo>(wide_message.as_ptr())
                .title(w!("KrampUI"))
                .show()
                .unwrap();

            if response == YesNo::Yes {
                open::that(link).unwrap();
                return;
            }
        }
    }
}

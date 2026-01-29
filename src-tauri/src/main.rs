// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![warn(clippy::unwrap_used)]
#![warn(clippy::expect_used)]

fn main() {
    journal_rocket_trading_lib::run()
}

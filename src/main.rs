//! netforge - 网络工具应用
//!
//! 提供 TCP 代理和 Socket 调试功能

pub mod events;
pub mod state;
pub mod cli;
pub mod config;
pub mod error;
pub mod proxy;
pub mod socket;

use clap::Parser;
use cli::{Cli, Commands, SocketCommands};
use config::Config;
use proxy::{run_tcp_proxy, run_tls_proxy};
use socket::{run_socket_client, run_socket_server, DataFormat};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("netforge=info".parse()?))
        .init();

    let cli = Cli::parse();

    // GUI mode - launch Tauri app
    if cli.gui {
        println!("Launching GUI mode...");
        println!("Please run: cargo tauri dev");
        println!("Or use the built app at: src-tauri/target/release/netforge-gui");
        return Ok(());
    }

    match cli.command {
        Some(Commands::Proxy(args)) => {
            let (listen, target, tls_config) = if let Some(config_path) = cli.config {
                let config = Config::from_file(config_path.to_str().unwrap())?;
                (
                    args.listen.unwrap_or(config.proxy.listen),
                    args.target.unwrap_or(config.proxy.target),
                    args.tls.then(|| {
                        let tls = config.proxy.tls.unwrap_or_default();
                        (args.cert.unwrap_or(tls.cert_path), args.key.unwrap_or(tls.key_path))
                    }),
                )
            } else {
                let listen = args.listen.expect("--listen is required");
                let target = args.target.expect("--target is required");
                let tls_config = if args.tls {
                    let cert = args.cert.expect("--cert is required for TLS");
                    let key = args.key.expect("--key is required for TLS");
                    Some((cert, key))
                } else {
                    None
                };
                (listen, target, tls_config)
            };

            if let Some((cert, key)) = tls_config {
                run_tls_proxy(&listen, &target, &cert, &key).await?;
            } else {
                run_tcp_proxy(&listen, &target).await?;
            }
        }
        Some(Commands::Socket(args)) => {
            let format: DataFormat = match args.command {
                SocketCommands::Client { ref format, .. } => {
                    format.parse().map_err(|e| anyhow::anyhow!("{}", e))?
                }
                SocketCommands::Server { ref format, .. } => {
                    format.parse().map_err(|e| anyhow::anyhow!("{}", e))?
                }
            };

            match args.command {
                SocketCommands::Client { connect, .. } => {
                    run_socket_client(&connect, format).await?;
                }
                SocketCommands::Server { listen, .. } => {
                    run_socket_server(&listen, format).await?;
                }
            }
        }
        None => {
            // No command, show help
            let _ = Cli::try_parse_from(["netforge", "--help"]);
        }
    }

    Ok(())
}

// CLI 命令定义

use clap::{Args, Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "netforge")]
#[command(about = "Network tools: TCP proxy and socket debugger", long_about = None)]
#[command(version)]
pub struct Cli {
    #[arg(short, long, global = true, value_name = "FILE")]
    pub config: Option<PathBuf>,

    #[command(subcommand)]
    pub command: Option<Commands>,

    #[arg(long, help = "Launch GUI mode (requires Tauri)")]
    pub gui: bool,
}

#[derive(Subcommand)]
pub enum Commands {
    #[command(about = "Start TCP/TLS proxy server")]
    Proxy(ProxyArgs),
    #[command(about = "Socket debugging tools")]
    Socket(SocketArgs),
}

#[derive(Args)]
pub struct ProxyArgs {
    #[arg(short, long, help = "Listen address (e.g., 127.0.0.1:8080)")]
    pub listen: Option<String>,

    #[arg(short, long, help = "Target address (e.g., 127.0.0.1:9000)")]
    pub target: Option<String>,

    #[arg(long, help = "Enable TLS mode")]
    pub tls: bool,

    #[arg(long, help = "Certificate file path (PEM format)")]
    pub cert: Option<String>,

    #[arg(long, help = "Private key file path (PEM format)")]
    pub key: Option<String>,
}

#[derive(Args)]
pub struct SocketArgs {
    #[command(subcommand)]
    pub command: SocketCommands,
}

#[derive(Subcommand)]
pub enum SocketCommands {
    #[command(about = "Start socket debug client")]
    Client {
        #[arg(long, help = "Server address to connect (e.g., 127.0.0.1:9999)")]
        connect: String,

        #[arg(
            short = 'f',
            long,
            default_value = "text",
            help = "Data format: hex, text, json"
        )]
        format: String,
    },

    #[command(about = "Start socket debug server")]
    Server {
        #[arg(short, long, help = "Listen address (e.g., 127.0.0.1:8888)")]
        listen: String,

        #[arg(
            short = 'f',
            long,
            default_value = "text",
            help = "Data format: hex, text, json"
        )]
        format: String,
    },
}

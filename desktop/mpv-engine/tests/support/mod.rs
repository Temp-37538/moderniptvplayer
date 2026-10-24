//! A tiny HTTP server that behaves like an IPTV provider: redirects from an
//! entry host to a node, byte ranges, refusals, slow streams, HLS.

#![allow(dead_code)]

use std::fs::File;
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Request {
    pub path: String,
    pub range: Option<String>,
    pub user_agent: Option<String>,
}

pub struct Server {
    pub port: u16,
    pub requests: Arc<Mutex<Vec<Request>>>,
    /// Responses the client abandoned before the end.
    pub aborted: Arc<AtomicUsize>,
}

impl Server {
    pub fn start(root: PathBuf) -> Server {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind");
        let port = listener.local_addr().unwrap().port();
        let requests = Arc::new(Mutex::new(Vec::new()));
        let aborted = Arc::new(AtomicUsize::new(0));
        let (req, abo) = (requests.clone(), aborted.clone());
        thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let (root, req, abo) = (root.clone(), req.clone(), abo.clone());
                thread::spawn(move || {
                    let _ = handle(stream, &root, &req, &abo);
                });
            }
        });
        Server { port, requests, aborted }
    }

    pub fn url(&self, path: &str) -> String {
        format!("http://127.0.0.1:{}{}", self.port, path)
    }

    pub fn requests_for(&self, prefix: &str) -> Vec<Request> {
        self.requests.lock().unwrap().iter().filter(|r| r.path.starts_with(prefix)).cloned().collect()
    }
}

fn safe_name(name: &str) -> bool {
    !name.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
}

fn handle(mut stream: TcpStream, root: &std::path::Path, log: &Mutex<Vec<Request>>, aborted: &AtomicUsize) -> std::io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(10)))?;
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut line = String::new();
    reader.read_line(&mut line)?;
    let mut parts = line.split_whitespace();
    let (_method, path) = (parts.next().unwrap_or(""), parts.next().unwrap_or("/").to_string());
    let (mut range, mut user_agent) = (None, None);
    loop {
        let mut header = String::new();
        if reader.read_line(&mut header)? == 0 || header == "\r\n" {
            break;
        }
        if let Some((name, value)) = header.split_once(':') {
            match name.trim().to_ascii_lowercase().as_str() {
                "range" => range = Some(value.trim().to_string()),
                "user-agent" => user_agent = Some(value.trim().to_string()),
                _ => {}
            }
        }
    }
    log.lock().unwrap().push(Request { path: path.clone(), range: range.clone(), user_agent });

    let (kind, name) = path.trim_start_matches('/').split_once('/').unwrap_or((path.trim_start_matches('/'), ""));
    match (kind, name) {
        ("forbidden", _) => respond(&mut stream, "403 Forbidden", &[], b"forbidden by provider"),
        ("entry", n) if safe_name(n) => {
            let location = format!("Location: /files/{n}");
            respond(&mut stream, "302 Found", &[&location], b"")
        }
        ("evil.m3u8", _) => {
            let body = b"#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nfile:///etc/hostname\n#EXT-X-ENDLIST\n";
            respond(&mut stream, "200 OK", &["Content-Type: application/vnd.apple.mpegurl"], body)
        }
        // A segment on a scheme that must never be followed (and an extension
        // ffmpeg's HLS demuxer allows): tells the whitelist from "not found".
        ("evil2.m3u8", _) => {
            let body = b"#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nfile:///tmp/does-not-exist.ts\n#EXT-X-ENDLIST\n";
            respond(&mut stream, "200 OK", &["Content-Type: application/vnd.apple.mpegurl"], body)
        }
        ("files", n) if safe_name(n) => serve_file(&mut stream, root.join(n), range, false, aborted),
        ("slow", n) if safe_name(n) => serve_file(&mut stream, root.join(n), range, true, aborted),
        ("hls", n) if safe_name(n) => serve_file(&mut stream, root.join("hls").join(n), range, false, aborted),
        _ => respond(&mut stream, "404 Not Found", &[], b"nope"),
    }
}

fn respond(stream: &mut TcpStream, status: &str, headers: &[&str], body: &[u8]) -> std::io::Result<()> {
    let mut head = format!("HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n", body.len());
    for h in headers {
        head.push_str(h);
        head.push_str("\r\n");
    }
    head.push_str("\r\n");
    stream.write_all(head.as_bytes())?;
    stream.write_all(body)
}

fn content_type(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("m3u8") => "application/vnd.apple.mpegurl",
        Some("mp4") | Some("m4s") => "video/mp4",
        _ => "video/x-matroska",
    }
}

fn serve_file(stream: &mut TcpStream, path: PathBuf, range: Option<String>, slow: bool, aborted: &AtomicUsize) -> std::io::Result<()> {
    let Ok(mut file) = File::open(&path) else {
        return respond(stream, "404 Not Found", &[], b"missing fixture");
    };
    let total = file.metadata()?.len();
    let (mut start, mut end, mut status) = (0u64, total.saturating_sub(1), "200 OK");
    if let Some(r) = range.as_deref().and_then(|r| r.strip_prefix("bytes=")) {
        if let Some((a, b)) = r.split_once('-') {
            start = a.parse().unwrap_or(0).min(total.saturating_sub(1));
            end = b.parse().unwrap_or(total - 1).min(total.saturating_sub(1));
            status = "206 Partial Content";
        }
    }
    let length = end + 1 - start;
    let mut head = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {}\r\nContent-Length: {length}\r\nAccept-Ranges: bytes\r\nConnection: close\r\n",
        content_type(&path)
    );
    if status.starts_with("206") {
        head.push_str(&format!("Content-Range: bytes {start}-{end}/{total}\r\n"));
    }
    head.push_str("\r\n");
    stream.write_all(head.as_bytes())?;
    file.seek(SeekFrom::Start(start))?;
    let mut left = length;
    let mut buffer = vec![0u8; if slow { 16 * 1024 } else { 64 * 1024 }];
    while left > 0 {
        let want = (left as usize).min(buffer.len());
        let n = file.read(&mut buffer[..want])?;
        if n == 0 {
            break;
        }
        if stream.write_all(&buffer[..n]).is_err() {
            aborted.fetch_add(1, Ordering::SeqCst);
            return Ok(());
        }
        left -= n as u64;
        if slow {
            thread::sleep(Duration::from_millis(40));
        }
    }
    Ok(())
}

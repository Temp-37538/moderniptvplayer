fn main() {
    // libmpv is shipped in Tauri's resource directory rather than beside the
    // executable. Delay-load it so main.rs can add that trusted directory to
    // the Windows DLL search path before the first libmpv call.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-arg=/DELAYLOAD:libmpv-2.dll");
        println!("cargo:rustc-link-lib=delayimp");
    }
    tauri_build::build()
}

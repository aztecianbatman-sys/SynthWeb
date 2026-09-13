use std::path::{Path, PathBuf};
use base64::Engine;
use reqwest::Client;
use sha2::{Digest, Sha256};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UpdateManifest {
    pub version: String,
    pub channel: String,
    pub sha256: String,
    pub url: String,
    pub size: u64,
}

fn validate_https(url: &str) -> Result<url::Url,String> {
    let parsed=url::Url::parse(url).map_err(|e|format!("Invalid update URL: {e}"))?;
    if parsed.scheme()!="https" { return Err("Updates require HTTPS.".into()); }
    Ok(parsed)
}

pub async fn fetch_manifest(url:&str,public_key:&[u8])->Result<UpdateManifest,String>{
    let parsed=validate_https(url)?;
    let bytes=Client::new().get(parsed).send().await.map_err(|e|format!("Manifest request failed: {e}"))?
        .error_for_status().map_err(|e|format!("Manifest HTTP error: {e}"))?.bytes().await.map_err(|e|e.to_string())?;
    let value:serde_json::Value=serde_json::from_slice(&bytes).map_err(|e|format!("Invalid manifest: {e}"))?;
    let sig=value.get("signature").and_then(|v|v.as_str()).ok_or_else(||"Manifest signature missing.".to_string())?;
    let payload=value.get("manifest").ok_or_else(||"Manifest payload missing.".to_string())?;
    let signed=serde_json::to_vec(payload).map_err(|e|e.to_string())?;
    let key:[u8;32]=public_key.try_into().map_err(|_|"Ed25519 public key must be 32 bytes.".to_string())?;
    let signature_bytes=base64::Engine::decode(&base64::engine::general_purpose::STANDARD,sig).map_err(|e|format!("Invalid signature encoding: {e}"))?;
    let sig:[u8;64]=signature_bytes.try_into().map_err(|_|"Ed25519 signature must be 64 bytes.".to_string())?;
    VerifyingKey::from_bytes(&key).map_err(|e|e.to_string())?.verify(&signed,&Signature::from_bytes(&sig)).map_err(|_|"Manifest signature verification failed.".to_string())?;
    let manifest:UpdateManifest=serde_json::from_value(payload.clone()).map_err(|e|format!("Invalid manifest fields: {e}"))?;
    if manifest.sha256.len()!=64 || !manifest.sha256.bytes().all(|b|b.is_ascii_hexdigit()) { return Err("Invalid update SHA-256.".into()); }
    validate_https(&manifest.url)?;
    Ok(manifest)
}

pub async fn stage_update(manifest:&UpdateManifest, staging_root:&Path)->Result<PathBuf,String>{
    std::fs::create_dir_all(staging_root).map_err(|e|e.to_string())?;
    let part=staging_root.join("update.partial");
    let final_path=staging_root.join(format!("synth-browser-{}.update",manifest.version));
    let mut resp=Client::new().get(validate_https(&manifest.url)?).send().await.map_err(|e|format!("Update download failed: {e}"))?.error_for_status().map_err(|e|format!("Update HTTP error: {e}"))?;
    let mut file=tokio::fs::File::create(&part).await.map_err(|e|e.to_string())?;
    let mut hasher=Sha256::new();
    let mut received=0u64;
    while let Some(chunk)=resp.chunk().await.map_err(|e|e.to_string())? {
        received+=chunk.len() as u64;
        if received>manifest.size { return Err("Update exceeded declared size.".into()); }
        hasher.update(&chunk);
        file.write_all(&chunk).await.map_err(|e|e.to_string())?;
    }
    file.flush().await.map_err(|e|e.to_string())?;
    if received!=manifest.size { return Err("Update size mismatch.".into()); }
    let actual=format!("{:x}",hasher.finalize());
    if !actual.eq_ignore_ascii_case(&manifest.sha256) { return Err("Update SHA-256 verification failed.".into()); }
    std::fs::rename(&part,&final_path).map_err(|e|e.to_string())?;
    Ok(final_path)
}

pub fn backup_current(executable:&Path,backup_dir:&Path)->Result<PathBuf,String>{
    std::fs::create_dir_all(backup_dir).map_err(|e|e.to_string())?;
    let backup=backup_dir.join("previous-version.bin");
    std::fs::copy(executable,&backup).map_err(|e|format!("Could not create updater rollback backup: {e}"))?;
    Ok(backup)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PendingUpdate {
    pub staged_path: String,
    pub backup_path: String,
    pub version: String,
    pub sha256: String,
}

pub fn sha256_file(path:&Path)->Result<String,String>{
    let mut file=std::fs::File::open(path).map_err(|e|e.to_string())?;
    let mut hasher=Sha256::new();
    let mut buf=[0u8;1024*1024];
    loop {
        use std::io::Read;
        let n=file.read(&mut buf).map_err(|e|e.to_string())?;
        if n==0 {break;}
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}",hasher.finalize()))
}

pub fn write_pending(root:&Path,pending:&PendingUpdate)->Result<PathBuf,String>{
    std::fs::create_dir_all(root).map_err(|e|e.to_string())?;
    let path=root.join("pending-update.json");
    let temp=root.join("pending-update.tmp");
    let bytes=serde_json::to_vec_pretty(pending).map_err(|e|e.to_string())?;
    std::fs::write(&temp,&bytes).map_err(|e|e.to_string())?;
    std::fs::rename(&temp,&path).map_err(|e|e.to_string())?;
    Ok(path)
}

pub fn read_pending(root:&Path)->Result<Option<PendingUpdate>,String>{
    let path=root.join("pending-update.json");
    if !path.is_file(){return Ok(None);}
    let bytes=std::fs::read(path).map_err(|e|e.to_string())?;
    serde_json::from_slice(&bytes).map(Some).map_err(|e|format!("Invalid pending update: {e}"))
}

pub fn clear_pending(root:&Path)->Result<(),String>{
    let path=root.join("pending-update.json");
    if path.exists(){std::fs::remove_file(path).map_err(|e|e.to_string())?;}
    Ok(())
}

pub fn prepare_verified_swap(executable:&Path,staged:&Path,version:&str,sha256:&str,root:&Path)->Result<PendingUpdate,String>{
    if !staged.is_file(){return Err("Staged update does not exist.".into());}
    let actual=sha256_file(staged)?;
    if !actual.eq_ignore_ascii_case(sha256){return Err("Staged update checksum mismatch.".into());}
    let backup=backup_current(executable,&root.join("backup"))?;
    Ok(PendingUpdate{staged_path:staged.to_string_lossy().to_string(),backup_path:backup.to_string_lossy().to_string(),version:version.to_string(),sha256:sha256.to_string()})
}

pub fn rollback(backup:&Path, executable:&Path)->Result<(),String>{
    if !backup.is_file(){return Err("Updater rollback backup is missing.".into());}
    if backup==executable{return Err("Rollback source and destination are identical.".into());}
    let temp=executable.with_extension("rollback.tmp");
    std::fs::copy(backup,&temp).map_err(|e|format!("Could not stage rollback: {e}"))?;
    let digest=sha256_file(&temp)?;
    if digest.is_empty(){let _=std::fs::remove_file(&temp);return Err("Rollback verification failed.".into());}
    std::fs::rename(&temp,executable).map_err(|e|format!("Could not replace executable for rollback: {e}"))?;
    Ok(())
}

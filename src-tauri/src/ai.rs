use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

fn validate_endpoint(endpoint: &str) -> Result<url::Url, String> {
    let u=url::Url::parse(endpoint).map_err(|e|format!("Invalid AI endpoint: {e}"))?;
    let localhost=matches!(u.host_str(),Some("127.0.0.1")|Some("localhost")|Some("::1"));
    if u.scheme()!="https" && !localhost {
        return Err("Hosted AI endpoints must use HTTPS. Local HTTP endpoints must target localhost.".into());
    }
    Ok(u)
}

fn secret_entry(provider: &str)->Result<keyring::Entry,String>{
    keyring::Entry::new("space.synth.browser.ai",provider).map_err(|e|e.to_string())
}

fn read_key(provider:&str)->Option<String>{
    secret_entry(provider).ok().and_then(|e|e.get_password().ok())
}

pub fn key_present(provider:&str)->bool{read_key(provider).is_some()}

pub fn set_key(provider:&str,key:&str)->Result<(),String>{
    if key.len()>10000{return Err("API key is too long.".into())}
    if key.trim().is_empty(){return Err("API key is empty.".into())}
    secret_entry(provider)?.set_password(key).map_err(|e|e.to_string())
}

pub fn delete_key(provider:&str)->Result<(),String>{
    match secret_entry(provider)?.delete_credential(){Ok(())=>Ok(()),Err(e)=>Err(e.to_string())}
}

pub async fn list_models(endpoint:&str,provider:&str)->Result<Vec<String>,String>{
    let base=validate_endpoint(endpoint)?;
    let url=if base.path().ends_with("/v1") {format!("{}/models",base.as_str().trim_end_matches('/'))} else {format!("{}/v1/models",base.as_str().trim_end_matches('/'))};
    let client=Client::builder().timeout(Duration::from_secs(10)).build().map_err(|e|e.to_string())?;
    let mut req=client.get(url);
    if let Some(key)=read_key(provider){req=req.bearer_auth(key);}
    let resp=req.send().await.map_err(|e|format!("AI provider unavailable: {e}"))?;
    let status=resp.status();
    let body:Value=resp.json().await.map_err(|e|format!("Invalid AI provider response: {e}"))?;
    if !status.is_success(){return Err(format!("AI provider returned HTTP {status}"))}
    let mut out=Vec::new();
    if let Some(items)=body.get("data").and_then(Value::as_array){
        for item in items {
            if let Some(id)=item.get("id").and_then(Value::as_str){out.push(id.to_string());}
        }
    }
    out.sort();
    out.dedup();
    Ok(out)
}

pub async fn chat(endpoint:&str,provider:&str,model:&str,system:&str,context:&str,question:&str)->Result<String,String>{
    if model.trim().is_empty(){return Err("No AI model is configured.".into())}
    let base=validate_endpoint(endpoint)?;
    let url=if base.path().ends_with("/v1") {format!("{}/chat/completions",base.as_str().trim_end_matches('/'))} else {format!("{}/v1/chat/completions",base.as_str().trim_end_matches('/'))};
    if context.len()>80_000{return Err("Selected context is too large.".into())}
    if question.len()>10_000{return Err("Question is too long.".into())}
    let client=Client::builder().timeout(Duration::from_secs(60)).build().map_err(|e|e.to_string())?;
    let messages=json!([
        {"role":"system","content":system},
        {"role":"user","content":format!("Context (explicitly provided by the user):\n{}\n\nQuestion:\n{}",context,question)}
    ]);
    let body=json!({"model":model,"messages":messages,"temperature":0.2});
    let mut req=client.post(url).json(&body);
    if let Some(key)=read_key(provider){req=req.bearer_auth(key);}
    else if !matches!(base.host_str(),Some("127.0.0.1")|Some("localhost")|Some("::1")){
        return Err("This hosted provider requires an API key. Store it in Synth Browser's secure credential store.".into());
    }
    let resp=req.send().await.map_err(|e|format!("AI provider unavailable: {e}"))?;
    let status=resp.status();
    let raw=resp.text().await.map_err(|e|format!("Could not read AI response: {e}"))?;
    if !status.is_success(){return Err(format!("AI provider returned HTTP {status}"))}
    let value:Value=serde_json::from_str(&raw).map_err(|e|format!("Invalid AI response: {e}"))?;
    let text=value.get("choices").and_then(Value::as_array).and_then(|a|a.first()).and_then(|x|x.get("message")).and_then(|m|m.get("content")).and_then(Value::as_str)
        .ok_or_else(||"AI provider returned no message content.".to_string())?;
    Ok(text.to_string())
}

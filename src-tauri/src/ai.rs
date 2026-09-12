use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProviderPreset {
    pub id: String,
    pub name: String,
    pub endpoint: String,
    pub api_key_required: bool,
    pub protocol: String,
}

pub fn presets() -> Vec<ProviderPreset> {
    vec![
        ProviderPreset { id:"ollama".into(), name:"Ollama".into(), endpoint:"http://127.0.0.1:11434/v1".into(), api_key_required:false, protocol:"openai-compatible".into() },
        ProviderPreset { id:"lmstudio".into(), name:"LM Studio".into(), endpoint:"http://127.0.0.1:1234/v1".into(), api_key_required:false, protocol:"openai-compatible".into() },
        ProviderPreset { id:"openai".into(), name:"OpenAI".into(), endpoint:"https://api.openai.com/v1".into(), api_key_required:true, protocol:"openai-compatible".into() },
        ProviderPreset { id:"openrouter".into(), name:"OpenRouter".into(), endpoint:"https://openrouter.ai/api/v1".into(), api_key_required:true, protocol:"openai-compatible".into() },
        ProviderPreset { id:"gemini".into(), name:"Google Gemini".into(), endpoint:"https://generativelanguage.googleapis.com/v1beta".into(), api_key_required:true, protocol:"gemini".into() },
        ProviderPreset { id:"anthropic".into(), name:"Anthropic".into(), endpoint:"https://api.anthropic.com".into(), api_key_required:true, protocol:"anthropic".into() },
        ProviderPreset { id:"custom".into(), name:"Custom OpenAI-compatible".into(), endpoint:"http://127.0.0.1:11434/v1".into(), api_key_required:false, protocol:"openai-compatible".into() },
    ]
}

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
    secret_entry(provider)?.delete_credential().map_err(|e|e.to_string())
}

fn require_key(provider:&str,endpoint:&url::Url)->Result<String,String>{
    if let Some(key)=read_key(provider){return Ok(key)}
    let local=matches!(endpoint.host_str(),Some("127.0.0.1")|Some("localhost")|Some("::1"));
    if local { Ok(String::new()) } else { Err("This hosted provider requires an API key.".into()) }
}

pub async fn list_models(endpoint:&str,provider:&str)->Result<Vec<String>,String>{
    let base=validate_endpoint(endpoint)?;
    let key=require_key(provider,&base)?;
    let client=Client::builder().timeout(Duration::from_secs(15)).build().map_err(|e|e.to_string())?;

    let mut out=Vec::new();
    if provider=="gemini" {
        let url=format!("{}/models?key={}",base.as_str().trim_end_matches('/'),urlencoding::encode(&key));
        let resp=client.get(url).send().await.map_err(|e|format!("Gemini unavailable: {e}"))?;
        let status=resp.status();
        let body:Value=resp.json().await.map_err(|e|format!("Invalid Gemini response: {e}"))?;
        if !status.is_success(){return Err(format!("Gemini returned HTTP {status}"))}
        if let Some(items)=body.get("models").and_then(Value::as_array){
            for item in items {
                if let Some(name)=item.get("name").and_then(Value::as_str){
                    if let Some(id)=name.strip_prefix("models/"){out.push(id.to_string())}
                }
            }
        }
    } else if provider=="anthropic" {
        let url=format!("{}/v1/models",base.as_str().trim_end_matches('/'));
        let resp=client.get(url).header("x-api-key",key).header("anthropic-version","2023-06-01").send().await.map_err(|e|format!("Anthropic unavailable: {e}"))?;
        let status=resp.status();
        let body:Value=resp.json().await.map_err(|e|format!("Invalid Anthropic response: {e}"))?;
        if !status.is_success(){return Err(format!("Anthropic returned HTTP {status}"))}
        if let Some(items)=body.get("data").and_then(Value::as_array){
            for item in items { if let Some(id)=item.get("id").and_then(Value::as_str){out.push(id.to_string())} }
        }
    } else {
        let url=if base.path().ends_with("/v1"){format!("{}/models",base.as_str().trim_end_matches('/'))}else{format!("{}/v1/models",base.as_str().trim_end_matches('/'))};
        let mut req=client.get(url);
        if !key.is_empty(){req=req.bearer_auth(key)}
        let resp=req.send().await.map_err(|e|format!("AI provider unavailable: {e}"))?;
        let status=resp.status();
        let body:Value=resp.json().await.map_err(|e|format!("Invalid AI provider response: {e}"))?;
        if !status.is_success(){return Err(format!("AI provider returned HTTP {status}"))}
        if let Some(items)=body.get("data").and_then(Value::as_array){
            for item in items { if let Some(id)=item.get("id").and_then(Value::as_str){out.push(id.to_string())} }
        }
    }
    out.sort();out.dedup();Ok(out)
}

fn validate_inputs(model:&str,context:&str,question:&str)->Result<(),String>{
    if model.trim().is_empty(){return Err("No AI model is configured.".into())}
    if context.len()>80_000{return Err("Selected context is too large.".into())}
    if question.len()>10_000{return Err("Question is too long.".into())}
    Ok(())
}

pub async fn chat(endpoint:&str,provider:&str,model:&str,system:&str,context:&str,question:&str)->Result<String,String>{
    validate_inputs(model,context,question)?;
    let base=validate_endpoint(endpoint)?;
    let key=require_key(provider,&base)?;
    let client=Client::builder().timeout(Duration::from_secs(90)).build().map_err(|e|e.to_string())?;

    match provider {
        "gemini" => {
            let url=format!("{}/models/{}:generateContent?key={}",base.as_str().trim_end_matches('/'),urlencoding::encode(model),urlencoding::encode(&key));
            let body=json!({"systemInstruction":{"parts":[{"text":system}]},"contents":[{"role":"user","parts":[{"text":format!("Context (explicitly provided by the user):\n{}\n\nQuestion:\n{}",context,question)}]}]});
            let resp=client.post(url).json(&body).send().await.map_err(|e|format!("Gemini unavailable: {e}"))?;
            let status=resp.status();
            let raw=resp.text().await.map_err(|e|e.to_string())?;
            if !status.is_success(){return Err(format!("Gemini returned HTTP {status}: {raw}"))}
            let value:Value=serde_json::from_str(&raw).map_err(|e|format!("Invalid Gemini response: {e}"))?;
            value.get("candidates").and_then(Value::as_array).and_then(|a|a.first()).and_then(|c|c.get("content")).and_then(|c|c.get("parts")).and_then(Value::as_array).and_then(|a|a.first()).and_then(|p|p.get("text")).and_then(Value::as_str).map(|s|s.to_string()).ok_or_else(||"Gemini returned no text content.".into())
        }
        "anthropic" => {
            let url=format!("{}/v1/messages",base.as_str().trim_end_matches('/'));
            let body=json!({"model":model,"max_tokens":2048,"system":system,"messages":[{"role":"user","content":[{"type":"text","text":format!("Context (explicitly provided by the user):\n{}\n\nQuestion:\n{}",context,question)}]}]});
            let resp=client.post(url).header("x-api-key",key).header("anthropic-version","2023-06-01").json(&body).send().await.map_err(|e|format!("Anthropic unavailable: {e}"))?;
            let status=resp.status();
            let raw=resp.text().await.map_err(|e|e.to_string())?;
            if !status.is_success(){return Err(format!("Anthropic returned HTTP {status}: {raw}"))}
            let value:Value=serde_json::from_str(&raw).map_err(|e|format!("Invalid Anthropic response: {e}"))?;
            value.get("content").and_then(Value::as_array).and_then(|a|a.first()).and_then(|p|p.get("text")).and_then(Value::as_str).map(|s|s.to_string()).ok_or_else(||"Anthropic returned no text content.".into())
        }
        _ => {
            let url=if base.path().ends_with("/v1"){format!("{}/chat/completions",base.as_str().trim_end_matches('/'))}else{format!("{}/v1/chat/completions",base.as_str().trim_end_matches('/'))};
            let body=json!({"model":model,"messages":[{"role":"system","content":system},{"role":"user","content":format!("Context (explicitly provided by the user):\n{}\n\nQuestion:\n{}",context,question)}]});
            let mut req=client.post(url).json(&body);
            if !key.is_empty(){req=req.bearer_auth(key)}
            if provider=="openrouter" {
                req=req.header("HTTP-Referer","https://synth.browser").header("X-Title","Synth Browser");
            }
            let resp=req.send().await.map_err(|e|format!("AI provider unavailable: {e}"))?;
            let status=resp.status();
            let raw=resp.text().await.map_err(|e|e.to_string())?;
            if !status.is_success(){return Err(format!("AI provider returned HTTP {status}: {raw}"))}
            let value:Value=serde_json::from_str(&raw).map_err(|e|format!("Invalid AI response: {e}"))?;
            value.get("choices").and_then(Value::as_array).and_then(|a|a.first()).and_then(|x|x.get("message")).and_then(|m|m.get("content")).and_then(Value::as_str).map(|s|s.to_string()).ok_or_else(||"AI provider returned no message content.".into())
        }
    }
}

pub async fn chat_stream(endpoint:&str,provider:&str,model:&str,system:&str,context:&str,question:&str,mut on_token:impl FnMut(String)+Send)->Result<(),String>{
    validate_inputs(model,context,question)?;
    if provider=="gemini" || provider=="anthropic" {
        let whole=chat(endpoint,provider,model,system,context,question).await?;
        if !whole.is_empty(){on_token(whole)}
        return Ok(());
    }
    let base=validate_endpoint(endpoint)?;
    let key=require_key(provider,&base)?;
    let client=Client::builder().timeout(Duration::from_secs(120)).build().map_err(|e|e.to_string())?;
    let url=if base.path().ends_with("/v1"){format!("{}/chat/completions",base.as_str().trim_end_matches('/'))}else{format!("{}/v1/chat/completions",base.as_str().trim_end_matches('/'))};
    let body=json!({"model":model,"messages":[{"role":"system","content":system},{"role":"user","content":format!("Context (explicitly provided by the user):\n{}\n\nQuestion:\n{}",context,question)}],"stream":true});
    let mut req=client.post(url).json(&body);
    if !key.is_empty(){req=req.bearer_auth(key)}
    if provider=="openrouter" {req=req.header("HTTP-Referer","https://synth.browser").header("X-Title","Synth Browser");}
    let resp=req.send().await.map_err(|e|format!("AI provider unavailable: {e}"))?;
    let status=resp.status();
    if !status.is_success(){let body=resp.text().await.unwrap_or_default();return Err(format!("AI provider returned HTTP {status}: {body}"))}
    let mut stream=resp.bytes_stream();
    let mut buffer=String::new();
    while let Some(chunk)=stream.next().await {
        let chunk=chunk.map_err(|e|e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(pos)=buffer.find('\n'){
            let line=buffer[..pos].trim_end_matches('\r').to_string();
            buffer.drain(..=pos);
            let data=line.strip_prefix("data: ").unwrap_or("");
            if data=="[DONE]" {return Ok(())}
            if data.is_empty(){continue}
            if let Ok(value)=serde_json::from_str::<Value>(data){
                if let Some(token)=value.get("choices").and_then(Value::as_array).and_then(|a|a.first()).and_then(|x|x.get("delta")).and_then(|d|d.get("content")).and_then(Value::as_str){
                    if !token.is_empty(){on_token(token.to_string())}
                }
            }
        }
    }
    Ok(())
}

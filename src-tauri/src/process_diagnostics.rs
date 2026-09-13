#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcessStats {
    pub memory_bytes: u64,
    pub peak_memory_bytes: u64,
    pub handles: Option<u32>,
    pub threads: Option<u32>,
    pub cpu_time_ms: u64,
    pub supported: bool,
}

#[cfg(windows)]
pub fn current_process() -> Result<ProcessStats, String> {
    use windows::Win32::System::ProcessStatus::{GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS};
    use windows::Win32::System::Threading::{GetCurrentProcess, GetProcessTimes, GetProcessHandleCount};
    use windows::Win32::Foundation::FILETIME;

    unsafe {
        let process=GetCurrentProcess();
        let mut mem=PROCESS_MEMORY_COUNTERS::default();
        let size=std::mem::size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
        GetProcessMemoryInfo(process,&mut mem,size).map_err(|e|e.to_string())?;

        let mut creation=FILETIME::default();
        let mut exit=FILETIME::default();
        let mut kernel=FILETIME::default();
        let mut user=FILETIME::default();
        GetProcessTimes(process,&mut creation,&mut exit,&mut kernel,&mut user).map_err(|e|e.to_string())?;

        let to_u64=|t:FILETIME|((t.dwHighDateTime as u64)<<32)|(t.dwLowDateTime as u64);
        let cpu_100ns=to_u64(kernel)+to_u64(user);
        let mut handle_count=0u32;
        let handles=GetProcessHandleCount(process,&mut handle_count).is_ok().then_some(handle_count);

        Ok(ProcessStats{
            memory_bytes:mem.WorkingSetSize as u64,
            peak_memory_bytes:mem.PeakWorkingSetSize as u64,
            handles,
            threads:None,
            cpu_time_ms:cpu_100ns/10_000,
            supported:true,
        })
    }
}

#[cfg(not(windows))]
pub fn current_process() -> Result<ProcessStats, String> {
    Ok(ProcessStats{memory_bytes:0,peak_memory_bytes:0,handles:None,threads:None,cpu_time_ms:0,supported:false})
}

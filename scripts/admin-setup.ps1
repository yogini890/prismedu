$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$first = Read-Host 'New Admin password (14–256 characters)' -AsSecureString
$second = Read-Host 'Confirm new Admin password' -AsSecureString
$firstPtr = [IntPtr]::Zero
$secondPtr = [IntPtr]::Zero
$process = $null
try {
    $firstPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
    $secondPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPtr)
    $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPtr)
    if ($password -cne $confirmation) { throw 'Passwords do not match. No account changed.' }
    if ($password.Length -lt 14 -or $password.Length -gt 256) { throw 'Use 14–256 characters. No account changed.' }
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = (Get-Command node -ErrorAction Stop).Source
    $start.Arguments = '--env-file-if-exists=.env server/admin.js'
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardInput = $true
    $start.StandardInputEncoding = New-Object System.Text.UTF8Encoding($false)
    $process = [System.Diagnostics.Process]::Start($start)
    $process.StandardInput.Write($password)
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'Admin setup failed. See the error above.' }
} finally {
    $password = $null
    $confirmation = $null
    if ($firstPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPtr) }
    if ($secondPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPtr) }
    $first.Dispose()
    $second.Dispose()
    if ($process) { $process.Dispose() }
}

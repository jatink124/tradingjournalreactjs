$desktopPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Trading Journal.lnk')
$targetBat = 'C:\coding\tradingjournalreactjs\start-desktop.bat'
$workingDir = 'C:\coding\tradingjournalreactjs'

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($desktopPath)
$shortcut.TargetPath = $targetBat
$shortcut.WorkingDirectory = $workingDir
$shortcut.WindowStyle = 7
$shortcut.Save()

Write-Host "Desktop shortcut created successfully at: $desktopPath"

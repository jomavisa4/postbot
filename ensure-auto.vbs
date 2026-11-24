' ensure-auto.vbs - garante que o postbot automatico esta rodando (autopost.mjs).
' - Se ja existe um node rodando autopost.mjs, nao faz nada (sem duplicar).
' - Se nao existe, inicia escondido. Usado pela tarefa agendada e tambem
'   pode ser clicado a mao para "ligar o bot agora".
' Ele descobre a propria pasta, entao nao depende de caminho com acento.
Option Explicit
Dim fso, sh, wmi, base, running, p, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = base
If Not fso.FolderExists(base & "\logs") Then fso.CreateFolder(base & "\logs")

running = False
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
For Each p In wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name='node.exe'")
  If Not IsNull(p.CommandLine) Then
    If InStr(LCase(p.CommandLine), "autopost.mjs") > 0 Then running = True
  End If
Next

If running Then
  WScript.Quit 0
End If

cmd = "cmd /c node autopost.mjs >> """ & base & "\logs\auto.log"" 2>&1"
' 0 = janela escondida, False = nao esperar terminar
sh.Run cmd, 0, False

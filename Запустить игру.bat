@echo off
chcp 65001 >nul
setlocal EnableExtensions DisableDelayedExpansion
title Восемь лап — две ноги
rem ==========================================================================
rem  Быстрый запуск игры «Восемь лап — две ноги» на Windows 10/11 без установки.
rem  Встроенный в Windows PowerShell поднимает маленький локальный веб-сервер
rem  (доступен только с этого компьютера) и открывает игру в браузере.
rem  Просто открыть index.html нельзя: браузеры не грузят JS-модули с file://.
rem  Чтобы выйти, закройте это окно или нажмите Q.
rem ==========================================================================
set "GAME_ROOT=%~dp0"
set "GAME_BAT=%~f0"
if not exist "%GAME_ROOT%index.html" goto nogame

set "PSEXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not exist "%PSEXE%" set "PSEXE=powershell.exe"
"%PSEXE%" -NoLogo -NoProfile -Command "$t=[IO.File]::ReadAllText($env:GAME_BAT,[Text.Encoding]::UTF8); $i=$t.IndexOf('#__POWER'+'SHELL__'); if ($i -lt 0) { exit 20 }; & ([ScriptBlock]::Create($t.Substring($i)))"
set "RC=%errorlevel%"
if "%RC%"=="0" goto end
if "%RC%"=="10" goto pauseend
if "%RC%"=="11" goto pauseend
if "%RC%"=="12" goto pauseend
goto python

:python
echo.
echo Встроенный сервер PowerShell не запустился (код %RC%). Пробую Python...
set "PYEXE="
py -3 -c "import http.server" >nul 2>nul && set "PYEXE=py -3"
if not defined PYEXE python -c "import http.server" >nul 2>nul && set "PYEXE=python"
if not defined PYEXE goto noserver
pushd "%GAME_ROOT%"
echo Игра: http://localhost:8000/ — не закрывайте это окно, пока играете.
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & start "" http://localhost:8000/"
%PYEXE% -c "import http.server as h; h.SimpleHTTPRequestHandler.extensions_map.update({'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'}); h.test(HandlerClass=h.SimpleHTTPRequestHandler, port=8000, bind='127.0.0.1')"
popd
goto pauseend

:noserver
echo.
echo Не удалось запустить локальный сервер: PowerShell недоступен, а Python не найден.
echo Установите Python с python.org и запустите этот файл снова
echo или откройте README.md — там описан ручной запуск.
goto pauseend

:nogame
echo.
echo Рядом с этим файлом нет index.html.
echo Сначала распакуйте архив с игрой целиком (правой кнопкой по архиву — «Извлечь все»),
echo затем запустите этот файл из папки игры.
goto pauseend

:pauseend
echo.
pause
:end
endlocal
exit /b

#__POWERSHELL__
# ============================================================================
#  Мини-сервер игры «Восемь лап — две ноги» на Windows PowerShell 5.1+
#  (встроен в Windows 10/11). Без установки и без прав администратора.
#  Слушает только 127.0.0.1 и ::1 — с других компьютеров сервер недоступен.
#  Отдаёт файлы папки игры с правильными типами (JS-модули, JSON, картинки,
#  видео с поддержкой Range для пользовательской кат-сцены).
# ============================================================================
$ErrorActionPreference = 'Stop'
try { $Host.UI.RawUI.WindowTitle = 'Восемь лап — две ноги · сервер игры' } catch { }

function Say([string]$text, [string]$color) {
  if ($color) { Write-Host $text -ForegroundColor $color } else { Write-Host $text }
}

# --- папка игры ---------------------------------------------------------------
$gameDir = $env:GAME_ROOT
if (-not $gameDir) { $gameDir = (Get-Location).ProviderPath }
$root = [IO.Path]::GetFullPath($gameDir)
if ($root.Length -gt 3) { $root = $root.TrimEnd([char[]]@([char]92, [char]47)) }
$sep = [string][IO.Path]::DirectorySeparatorChar
if ($root.EndsWith($sep)) { $rootPrefix = $root } else { $rootPrefix = $root + $sep }
if (-not [IO.File]::Exists([IO.Path]::Combine($root, 'index.html'))) {
  Say "Не найден index.html в папке: $root" 'Red'
  [Environment]::Exit(11)
}
$rootTag = [Uri]::EscapeDataString($root)

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.htm' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.map' = 'application/json; charset=utf-8'
  '.md' = 'text/plain; charset=utf-8'; '.txt' = 'text/plain; charset=utf-8'; '.vtt' = 'text/vtt; charset=utf-8'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'
  '.webp' = 'image/webp'; '.avif' = 'image/avif'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
  '.mp4' = 'video/mp4'; '.m4v' = 'video/mp4'; '.webm' = 'video/webm'; '.ogv' = 'video/ogg'; '.mov' = 'video/quicktime'
  '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.oga' = 'audio/ogg'; '.wav' = 'audio/wav'; '.m4a' = 'audio/mp4'
  '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.ttf' = 'font/ttf'; '.otf' = 'font/otf'
  '.glb' = 'model/gltf-binary'; '.gltf' = 'model/gltf+json'; '.bin' = 'application/octet-stream'; '.wasm' = 'application/wasm'
}
$chunk = [long](4 * 1024 * 1024)      # максимум байт на один ответ Range: видео идёт частями, сервер не «залипает»
$buf = New-Object byte[] 262144
$clients = New-Object System.Collections.ArrayList
$state = @{ Served = 0 }
$url = ''

function Test-SocketError($err) {
  $e = $err.Exception
  while ($e) {
    if ($e -is [System.Net.Sockets.SocketException]) { return $true }
    $e = $e.InnerException
  }
  return $false
}

function Open-Listener($ip, [int]$p) {
  try {
    $l = New-Object System.Net.Sockets.TcpListener -ArgumentList @($ip, $p)
    $l.Start()
    return $l
  } catch {
    if (Test-SocketError $_) { return $null }   # порт занят или зарезервирован системой
    throw
  }
}

# Порт занят? Если это уже запущенная копия этой же игры — вернём её адрес.
function Find-OwnServer([int]$p) {
  $t = $null
  try {
    $t = New-Object System.Net.Sockets.TcpClient
    $ar = $t.BeginConnect('127.0.0.1', $p, $null, $null)
    if (-not $ar.AsyncWaitHandle.WaitOne(800)) { return $null }
    $t.EndConnect($ar)
    $t.ReceiveTimeout = 2000
    $t.SendTimeout = 2000
    $st = $t.GetStream()
    $q = [Text.Encoding]::ASCII.GetBytes("HEAD / HTTP/1.1`r`nHost: 127.0.0.1:$p`r`nConnection: close`r`n`r`n")
    $st.Write($q, 0, $q.Length)
    $ms = New-Object System.IO.MemoryStream
    $tmp = New-Object byte[] 4096
    while ($ms.Length -lt 65536) {
      $n = $st.Read($tmp, 0, $tmp.Length)
      if ($n -le 0) { break }
      $ms.Write($tmp, 0, $n)
      if ([Text.Encoding]::ASCII.GetString($ms.ToArray()).Contains("`r`n`r`n")) { break }
    }
    $txt = [Text.Encoding]::ASCII.GetString($ms.ToArray())
    if (-not $txt.Contains("X-Vosem-Lap-Root: $rootTag`r`n")) { return $null }
    $m = [regex]::Match($txt, 'X-Vosem-Lap-Url: ([^\r\n]+)')
    if ($m.Success) { return $m.Groups[1].Value }
    return "http://127.0.0.1:$p/"
  } catch {
    return $null
  } finally {
    if ($t) { try { $t.Close() } catch { } }
  }
}

function Send-Head($c, [string]$head) {
  $hb = [Text.Encoding]::ASCII.GetBytes($head)
  $c.Stream.Write($hb, 0, $hb.Length)
}

function Send-Text($c, [int]$code, [string]$reason, [string]$msg, [bool]$keep, [bool]$headOnly, [string]$extra) {
  $html = '<!doctype html><meta charset="utf-8"><title>' + $code + '</title>' +
    '<body style="font:16px sans-serif;padding:24px;background:#1d1726;color:#f3eadb"><h1>' + $code + '</h1><p>' + $msg + '</p>'
  $body = [Text.Encoding]::UTF8.GetBytes($html)
  $head = "HTTP/1.1 $code $reason`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`n$extra"
  if ($keep) { $head += "Connection: keep-alive`r`n`r`n" } else { $head += "Connection: close`r`n`r`n" }
  Send-Head $c $head
  if (-not $headOnly) { $c.Stream.Write($body, 0, $body.Length) }
}

# Обработка одного HTTP-запроса. Возвращает $true, если соединение остаётся открытым.
function Invoke-Request($c, [string]$head) {
  $lines = $head -split "`r`n"
  $first = $lines[0].Split(' ')
  if ($first.Length -ne 3) { Send-Text $c 400 'Bad Request' 'Неверный запрос.' $false $false ''; return $false }
  $method = $first[0].ToUpperInvariant()
  $target = $first[1]
  $version = $first[2].ToUpperInvariant()
  $h = @{}
  for ($k = 1; $k -lt $lines.Length; $k++) {
    $p = $lines[$k].IndexOf(':')
    if ($p -gt 0) { $h[$lines[$k].Substring(0, $p).Trim().ToLowerInvariant()] = $lines[$k].Substring($p + 1).Trim() }
  }
  $keep = ($version -eq 'HTTP/1.1') -and ([string]$h['connection'] -notmatch 'close')
  $headOnly = ($method -eq 'HEAD')
  if ($method -ne 'GET' -and $method -ne 'HEAD') {
    Send-Text $c 405 'Method Not Allowed' 'Поддерживаются только GET и HEAD.' $false $false "Allow: GET, HEAD`r`n"
    return $false
  }
  $state.Served++
  if ($state.Served -eq 1) { Say '  Браузер подключился. Приятной игры!' 'Green'; Say '' }

  $rawPath = $target
  $query = ''
  $qi = $target.IndexOfAny([char[]]@([char]'?', [char]'#'))
  if ($qi -ge 0) { $rawPath = $target.Substring(0, $qi); $query = $target.Substring($qi) }
  if (-not $rawPath.StartsWith('/')) { Send-Text $c 400 'Bad Request' 'Неверный адрес.' $false $headOnly ''; return $false }
  try { $path = [Uri]::UnescapeDataString($rawPath) } catch { $path = $rawPath }
  $rel = $path.TrimStart([char[]]@([char]47, [char]92)).Replace('/', $sep)
  $full = $null
  try { $full = [IO.Path]::GetFullPath([IO.Path]::Combine($root, $rel)) } catch { $full = $null }
  $cmp = [StringComparison]::OrdinalIgnoreCase
  if (-not $full -or -not ($full.Equals($root, $cmp) -or $full.StartsWith($rootPrefix, $cmp))) {
    Send-Text $c 403 'Forbidden' 'Доступ запрещён.' $keep $headOnly ''
    return $keep
  }
  if ([IO.Directory]::Exists($full)) {
    if (-not $rawPath.EndsWith('/')) {
      Send-Text $c 301 'Moved Permanently' 'Перенаправление.' $keep $headOnly ('Location: ' + $rawPath + '/' + $query + "`r`n")
      return $keep
    }
    $full = [IO.Path]::Combine($full, 'index.html')
  }
  if (-not [IO.File]::Exists($full)) {
    if ($path -ne '/favicon.ico' -and -not $path.StartsWith('/.well-known/')) { Say ('  нет файла: ' + $path) 'DarkYellow' }
    Send-Text $c 404 'Not Found' ('Файл не найден: ' + [System.Net.WebUtility]::HtmlEncode($path)) $keep $headOnly ''
    return $keep
  }

  $type = $types[[IO.Path]::GetExtension($full)]
  if (-not $type) { $type = 'application/octet-stream' }
  $fs = New-Object System.IO.FileStream -ArgumentList @($full, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
  try {
    $total = [long]$fs.Length
    $start = [long]0
    $last = $total - 1
    $code = 200
    $reason = 'OK'
    $range = [string]$h['range']
    if ($range -match '^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$') {
      $a = $Matches[1]
      $b = $Matches[2]
      if ($a -eq '' -and $b -eq '') { $a = '0' }
      if ($a -eq '') {
        $start = [Math]::Max([long]0, $total - [long]$b)
      } else {
        $start = [long]$a
        if ($b -ne '') { $last = [Math]::Min([long]$b, $total - 1) }
        elseif (($last - $start + 1) -gt $chunk) { $last = $start + $chunk - 1 }
      }
      if ($start -ge $total -or $start -gt $last) {
        Send-Text $c 416 'Range Not Satisfiable' 'Неверный диапазон.' $keep $headOnly "Content-Range: bytes */$total`r`n"
        return $keep
      }
      $code = 206
      $reason = 'Partial Content'
    }
    $len = $last - $start + 1
    if ($len -lt 0) { $len = 0 }
    $head = "HTTP/1.1 $code $reason`r`nContent-Type: $type`r`nContent-Length: $len`r`nAccept-Ranges: bytes`r`n" +
      "Cache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`n"
    if ($code -eq 206) { $head += "Content-Range: bytes $start-$last/$total`r`n" }
    if ($rawPath -eq '/') { $head += "X-Vosem-Lap-Root: $rootTag`r`nX-Vosem-Lap-Url: $url`r`n" }
    if ($keep) { $head += "Connection: keep-alive`r`n`r`n" } else { $head += "Connection: close`r`n`r`n" }
    Send-Head $c $head
    if (-not $headOnly -and $len -gt 0) {
      $fs.Position = $start
      $left = $len
      while ($left -gt 0) {
        $want = [int][Math]::Min([long]$buf.Length, $left)
        $n = $fs.Read($buf, 0, $want)
        if ($n -le 0) { break }
        $c.Stream.Write($buf, 0, $n)
        $left -= $n
      }
    }
  } finally {
    $fs.Dispose()
  }
  return $keep
}

function Close-Client($c) {
  if ($c.Closed) { return }
  $c.Closed = $true
  try { $c.Tcp.Client.Shutdown([System.Net.Sockets.SocketShutdown]::Both) } catch { }
  try { $c.Tcp.Close() } catch { }
}

# Читает доступные байты; когда заголовки запроса пришли целиком — отвечает.
function Read-Client($c) {
  $avail = $c.Tcp.Available
  if ($avail -le 0) { return $false }          # «готов к чтению», но данных нет — клиент закрыл соединение
  $n = $c.Stream.Read($buf, 0, [Math]::Min($buf.Length, $avail))
  if ($n -le 0) { return $false }
  $c.Data.Write($buf, 0, $n)
  $c.Last = [DateTime]::UtcNow
  while ($true) {
    $bytes = $c.Data.ToArray()
    $text = [Text.Encoding]::ASCII.GetString($bytes)
    $endAt = $text.IndexOf("`r`n`r`n")
    if ($endAt -lt 0) { return ($bytes.Length -lt 65536) }
    $c.Data.SetLength(0)
    $restAt = $endAt + 4
    if ($bytes.Length -gt $restAt) { $c.Data.Write($bytes, $restAt, $bytes.Length - $restAt) }
    $keep = Invoke-Request $c $text.Substring(0, $endAt)
    if (-not $keep) { return $false }
    if ($c.Data.Length -eq 0) { return $true }
  }
}

# --- запуск: порт 8000, если занят — запасные ---------------------------------
try {
  $v6 = $false
  try { $v6 = [System.Net.Sockets.Socket]::OSSupportsIPv6 } catch { }
  $candidates = @(8000..8020) + @(18000..18010) + @(28080..28090) + @(38000..38010)
  $listeners = @()
  $port = 0
  $urlHost = '127.0.0.1'
  $probed = @{}
  foreach ($pass in 1, 2) {
    if ($pass -eq 1 -and -not $v6) { continue }
    foreach ($p in $candidates) {
      $l4 = Open-Listener ([System.Net.IPAddress]::Loopback) $p
      if (-not $l4) {
        if (-not $probed.ContainsKey($p)) {
          $probed[$p] = $true
          $own = Find-OwnServer $p
          if ($own) {
            Say "Игра уже запущена в другом окне — открываю её в браузере: $own" 'Green'
            try { Start-Process $own } catch { Say "Откройте адрес вручную: $own" 'DarkYellow' }
            Start-Sleep -Seconds 2
            [Environment]::Exit(0)
          }
        }
        continue
      }
      if ($pass -eq 1) {
        $l6 = Open-Listener ([System.Net.IPAddress]::IPv6Loopback) $p
        if (-not $l6) { $l4.Stop(); continue }
        $listeners = @($l4, $l6)
        $urlHost = 'localhost'
      } else {
        $listeners = @($l4)
      }
      $port = $p
      break
    }
    if ($port) { break }
  }
} catch {
  Say ('Не удалось запустить сервер PowerShell: ' + $_.Exception.Message) 'Red'
  [Environment]::Exit(20)
}
if (-not $port) {
  Say 'Не удалось занять ни один порт (8000–8020 и запасные): все заняты другими программами.' 'Red'
  Say 'Закройте лишние программы или перезагрузите компьютер и запустите файл снова.' 'Red'
  [Environment]::Exit(10)
}

$url = "http://${urlHost}:$port/"
Say ''
Say '  Восемь лап — две ноги' 'Cyan'
Say '  ------------------------------------------------------------'
Say "  Игра открывается в браузере:  $url" 'Green'
Say '  Если вкладка не открылась — откройте этот адрес сами'
Say '  (Chrome, Edge или Firefox).'
if ($port -ne 8000) {
  Say "  Порт 8000 занят, выбран $port. Сохранения привязаны к адресу," 'DarkYellow'
  Say '  поэтому на другом порте прогресс начнётся заново.' 'DarkYellow'
}
Say ''
Say '  Не закрывайте это окно, пока играете.'
Say '  Выход: закройте окно или нажмите Q.'
Say ''
try { Start-Process $url } catch { Say "  Браузер не открылся сам — откройте $url вручную." 'DarkYellow' }

# --- основной цикл: один поток, Socket.Select по всем соединениям -------------
$keys = $true
try { if ([Console]::IsInputRedirected) { $keys = $false } } catch { $keys = $false }
if ($keys) { try { [Console]::TreatControlCAsInput = $true } catch { $keys = $false } }
$rc = 0
$quit = $false
try {
  while (-not $quit) {
    $read = New-Object System.Collections.ArrayList
    foreach ($l in $listeners) { [void]$read.Add($l.Server) }
    foreach ($x in $clients) { [void]$read.Add($x.Tcp.Client) }
    try { [System.Net.Sockets.Socket]::Select($read, $null, $null, 250000) }
    catch { $read.Clear(); Start-Sleep -Milliseconds 50 }
    foreach ($s in @($read)) {
      $hs = $s.Handle
      $lis = $null
      foreach ($l in $listeners) { if ($l.Server.Handle -eq $hs) { $lis = $l } }
      if ($lis) {
        while ($lis.Pending()) {
          $tcp = $lis.AcceptTcpClient()
          $tcp.NoDelay = $true
          $tcp.SendTimeout = 15000
          [void]$clients.Add(@{ Tcp = $tcp; Handle = $tcp.Client.Handle; Stream = $tcp.GetStream();
            Data = (New-Object System.IO.MemoryStream); Last = [DateTime]::UtcNow; Closed = $false })
        }
        continue
      }
      foreach ($x in $clients) {
        if ($x.Closed -or $x.Handle -ne $hs) { continue }
        $ok = $false
        try { $ok = Read-Client $x } catch { $ok = $false }
        if (-not $ok) { Close-Client $x }
      }
    }
    $now = [DateTime]::UtcNow
    $alive = New-Object System.Collections.ArrayList
    foreach ($x in $clients) {
      if (-not $x.Closed -and ($now - $x.Last).TotalSeconds -gt 60) { Close-Client $x }
      if (-not $x.Closed) { [void]$alive.Add($x) }
    }
    $clients = $alive
    if ($keys) {
      try {
        while ([Console]::KeyAvailable) {
          $key = [Console]::ReadKey($true)
          if ($key.Key -eq [ConsoleKey]::Q) { $quit = $true }
          elseif ($key.Key -eq [ConsoleKey]::C -and ($key.Modifiers -band [ConsoleModifiers]::Control)) { $quit = $true }
        }
      } catch { $keys = $false }
    }
  }
} catch {
  Say ('  Ошибка сервера: ' + $_.Exception.Message) 'Red'
  $rc = 12
} finally {
  foreach ($x in $clients) { Close-Client $x }
  foreach ($l in $listeners) { try { $l.Stop() } catch { } }
  if ($keys) { try { [Console]::TreatControlCAsInput = $false } catch { } }
}
if ($rc -eq 0) { Say '  Сервер остановлен. До встречи!' }
[Environment]::Exit($rc)

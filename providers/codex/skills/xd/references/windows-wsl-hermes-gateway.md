# Windows Server 2022 + WSL2 Hermes Gateway

Use this reference when Xenesis Desk runs on Windows and Hermes runs in WSL2 Ubuntu.

## Problem

Xenesis Desk usually writes its MCP bridge state to:

```text
C:\Users\<WindowsUser>\.xenis\mcp\bridge.json
```

Hermes in WSL2 cannot reach the Windows bridge through WSL `127.0.0.1`, because WSL loopback is local to the Linux VM. Use the Windows host IP from WSL and, if the bridge is bound to Windows loopback only, add a Windows portproxy.

## WSL Environment

In WSL:

```bash
WIN_HOST_IP=$(awk '/nameserver/{print $2; exit}' /etc/resolv.conf)
STATE="/mnt/c/Users/<WindowsUser>/.xenis/mcp/bridge.json"
TOKEN=$(python3 -c "import json; print(json.load(open('$STATE'))['bridgeToken'])")

export XENIS_MCP_BRIDGE_URL="http://$WIN_HOST_IP:3847"
export XENIS_MCP_BRIDGE_TOKEN="$TOKEN"
export XENIS_MCP_STATE_FILE="$STATE"
```

Test:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "http://$WIN_HOST_IP:3847/state"
```

## File Paths

When a mobile `/xd` command sends a file path to Windows Xenesis Desk from WSL:

- Prefer Windows paths such as `D:\work\demo.md` when the file already lives on a Windows drive.
- `/mnt/<drive>/...` paths are accepted for bridge-backed operations and normalized by Xenesis Desk, for example `/mnt/d/work/demo.md` becomes `D:\work\demo.md`.
- XCON Markdown creation uses the Xenesis Desk bridge/native MCP path. If `workspaceDir` is omitted or relative, native MCP resolves it under `XENIS_HOME\exports`, not the Hermes WSL cwd.
- Linux-only paths such as `/home/user/demo.md` are not visible to Windows Xenesis Desk unless they are copied or exposed through a Windows-readable path first.

## Windows Portproxy

Run in elevated Windows PowerShell when WSL cannot connect:

```powershell
$wslHostIp = "172.xx.xx.1"

netsh interface portproxy add v4tov4 `
  listenaddress=$wslHostIp listenport=3847 `
  connectaddress=127.0.0.1 connectport=3847

New-NetFirewallRule `
  -DisplayName "Xenesis Desk MCP bridge from WSL" `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalAddress $wslHostIp `
  -LocalPort 3847
```

Remove later if needed:

```powershell
netsh interface portproxy delete v4tov4 listenaddress=$wslHostIp listenport=3847
Remove-NetFirewallRule -DisplayName "Xenesis Desk MCP bridge from WSL"
```

## Hermes Plugin Check

In WSL:

```bash
hermes plugins enable xenesis_desk_gateway
hermes gateway run
```

From mobile:

```text
/xd status
/xd mobile
/xd run echo e2e-from-mobile
/xd terminals
/xd tail #1
```

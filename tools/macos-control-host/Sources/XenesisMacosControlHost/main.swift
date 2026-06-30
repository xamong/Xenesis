import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

struct HostRequest: Decodable {
    let action: String
    let target: [String: JSONValue]?
    let options: [String: JSONValue]?
}

struct HostResponse: Encodable {
    let ok: Bool
    let action: String
    let approvalLevel: String
    let processId: Int?
    let windows: [HostWindow]
    let message: String
    let code: String?
    let error: String?
    let providers: [String: Bool]?
    let permissions: [String: String]?
    let target: HostTarget?
    let observationMode: String?
    let observation: HostElement?
    let element: HostElement?
    let tree: [HostElement]?
    let screenshotPath: String?
    let screenshot: HostScreenshot?
    let highlight: HostHighlight?
    let truncated: Bool?
    let warnings: [String]?
}

struct HostWindow: Encodable {
    let windowId: String
    let processId: Int?
    let title: String
    let bounds: HostBounds?
    let isForeground: Bool?
}

struct HostBounds: Encodable {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
}

struct HostTarget: Encodable {
    let appId: String?
    let windowId: String?
    let processId: Int?
    let processName: String?
    let title: String?
    let className: String?
    let bounds: HostBounds?
}

struct HostElement: Encodable {
    let elementRef: String
    let provider: String
    let name: String?
    let role: String?
    let value: String?
    let automationId: String?
    let className: String?
    let controlType: String?
    let state: [String]?
    let bounds: HostBounds?
    let children: [HostElement]?
    let childCount: Int?
    let truncated: Bool?
    let source: String?
    let confidence: Double?
}

struct HostScreenshot: Encodable {
    let path: String?
    let dataUrl: String?
    let mimeType: String?
    let width: Int?
    let height: Int?
    let bounds: HostBounds?
    let elementRef: String?
    let source: String?
    let confidence: Double?
}

struct HostHighlight: Encodable {
    let bounds: HostBounds?
    let elementRef: String?
    let durationMs: Int?
    let source: String?
    let confidence: Double?
}

struct RequestTarget {
    let appId: String?
    let bundleId: String?
    let executable: String?
    let path: String?
    let processName: String?
    let titleContains: String?
    let windowId: String?
    let elementRef: String?
    let x: Int?
    let y: Int?
    let startX: Int?
    let startY: Int?
    let endX: Int?
    let endY: Int?

    init(_ raw: [String: JSONValue]?) {
        appId = raw?["appId"]?.stringValue
        bundleId = raw?["bundleId"]?.stringValue
        executable = raw?["executable"]?.stringValue
        path = raw?["path"]?.stringValue
        processName = raw?["processName"]?.stringValue
        titleContains = raw?["titleContains"]?.stringValue
        windowId = raw?["windowId"]?.stringValue
        elementRef = raw?["elementRef"]?.stringValue
        x = raw?["x"]?.intValue
        y = raw?["y"]?.intValue
        startX = raw?["startX"]?.intValue
        startY = raw?["startY"]?.intValue
        endX = raw?["endX"]?.intValue
        endY = raw?["endY"]?.intValue
    }
}

struct RequestOptions {
    let args: [String]
    let text: String?
    let keys: [String]
    let screenshotPath: String?
    let durationMs: Int
    let depth: Int
    let limit: Int
    let includeValues: Bool
    let includeFullTree: Bool
    let includeTreePreview: Bool

    init(_ raw: [String: JSONValue]?) {
        args = raw?["args"]?.stringArrayValue ?? []
        text = raw?["text"]?.stringValue
        keys = raw?["keys"]?.stringArrayValue ?? []
        screenshotPath = raw?["screenshotPath"]?.stringValue
        durationMs = raw?["durationMs"]?.intValue ?? 900
        depth = raw?["depth"]?.intValue ?? 2
        limit = raw?["limit"]?.intValue ?? 80
        includeValues = raw?["includeValues"]?.boolValue ?? false
        includeFullTree = raw?["includeFullTree"]?.boolValue ?? false
        includeTreePreview = raw?["includeTreePreview"]?.boolValue ?? false
    }
}

enum JSONValue: Decodable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    var stringValue: String? {
        if case .string(let value) = self {
            return value.isEmpty ? nil : value
        }
        return nil
    }

    var stringArrayValue: [String]? {
        if case .array(let values) = self {
            return values.compactMap { $0.stringValue }
        }
        return nil
    }

    var intValue: Int? {
        if case .number(let value) = self {
            return Int(value.rounded())
        }
        return nil
    }

    var boolValue: Bool? {
        if case .bool(let value) = self {
            return value
        }
        return nil
    }
}

func response(
    ok: Bool,
    action: String,
    message: String,
    processId: Int? = nil,
    windows: [HostWindow] = [],
    code: String? = nil,
    error: String? = nil,
    providers: [String: Bool]? = nil,
    permissions: [String: String]? = nil,
    target: HostTarget? = nil,
    observationMode: String? = nil,
    observation: HostElement? = nil,
    element: HostElement? = nil,
    tree: [HostElement]? = nil,
    screenshotPath: String? = nil,
    screenshot: HostScreenshot? = nil,
    highlight: HostHighlight? = nil,
    truncated: Bool? = nil,
    warnings: [String]? = nil
) -> HostResponse {
    HostResponse(
        ok: ok,
        action: action,
        approvalLevel: "low",
        processId: processId,
        windows: windows,
        message: message,
        code: code,
        error: error,
        providers: providers,
        permissions: permissions,
        target: target,
        observationMode: observationMode,
        observation: observation,
        element: element,
        tree: tree,
        screenshotPath: screenshotPath,
        screenshot: screenshot,
        highlight: highlight,
        truncated: truncated,
        warnings: warnings
    )
}

func providerStatus() -> [String: Bool] {
    [
        "workspace": true,
        "cgwindow": true,
        "ax": AXIsProcessTrusted(),
        "screencapturekit": false,
        "apple-events": false
    ]
}

func permissionStatus(action: String) -> HostResponse {
    response(
        ok: true,
        action: action,
        message: "macOS control host permission status completed.",
        providers: providerStatus(),
        permissions: [
            "accessibility": "unknown",
            "screenRecording": "unknown",
            "automation": "unknown"
        ]
    )
}

func handle(_ request: HostRequest) -> HostResponse {
    switch request.action {
    case "selfTest":
        return response(
            ok: true,
            action: request.action,
            message: "macOS control host self-test completed.",
            providers: providerStatus(),
            permissions: [
                "accessibility": "unknown",
                "screenRecording": "unknown",
                "automation": "unknown"
            ]
        )
    case "permissionStatus":
        return permissionStatus(action: request.action)
    case "launch":
        return launchApp(request)
    case "find":
        return findApp(request)
    case "status":
        return statusApp(request)
    case "focus":
        return focusApp(request)
    case "inspect":
        return inspectAccessibility(request)
    case "tree":
        return treeAccessibility(request)
    case "elementFromPoint":
        return elementFromPointAccessibility(request)
    case "click", "doubleClick", "tripleClick", "middleClick", "rightClick", "move", "mouseDown", "mouseUp":
        return pointerInput(request)
    case "dragAndDrop":
        return dragInput(request)
    case "typeText":
        return typeTextInput(request)
    case "hotkey":
        return hotkeyInput(request)
    case "screenshot":
        return screenshotCapture(request)
    case "captureElement":
        return elementCapture(request)
    case "highlight":
        return highlightTarget(request)
    default:
        return response(
            ok: false,
            action: request.action,
            message: "macOS control host action is not supported.",
            code: "unsupported_action",
            error: "Unsupported macOS control host action: \(request.action)"
        )
    }
}

func launchApp(_ request: HostRequest) -> HostResponse {
    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    guard let url = applicationURL(target) else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS control host launch failed.",
            code: "target_not_found",
            error: "Application target was not found."
        )
    }

    let configuration = NSWorkspace.OpenConfiguration()
    configuration.arguments = options.args

    var runningApplication: NSRunningApplication?
    var launchError: Error?
    let semaphore = DispatchSemaphore(value: 0)
    NSWorkspace.shared.openApplication(at: url, configuration: configuration) { app, error in
        runningApplication = app
        launchError = error
        semaphore.signal()
    }
    semaphore.wait()

    if let launchError {
        return response(
            ok: false,
            action: request.action,
            message: "macOS control host launch failed.",
            code: "host_failed",
            error: launchError.localizedDescription
        )
    }

    let processId = runningApplication.map { Int($0.processIdentifier) }
    return response(
        ok: true,
        action: request.action,
        message: "macOS control host launch completed.",
        processId: processId,
        windows: listWindows(target: target, processId: processId)
    )
}

func findApp(_ request: HostRequest) -> HostResponse {
    let target = RequestTarget(request.target)
    let app = findRunningApplication(target)
    let processId = app.map { Int($0.processIdentifier) }
    return response(
        ok: true,
        action: request.action,
        message: "macOS control host find completed.",
        processId: processId,
        windows: listWindows(target: target, processId: processId)
    )
}

func statusApp(_ request: HostRequest) -> HostResponse {
    let target = RequestTarget(request.target)
    let app = findRunningApplication(target)
    let processId = app.map { Int($0.processIdentifier) }
    return response(
        ok: true,
        action: request.action,
        message: "macOS control host status completed.",
        processId: processId,
        windows: listWindows(target: target, processId: processId),
        providers: providerStatus()
    )
}

func focusApp(_ request: HostRequest) -> HostResponse {
    let target = RequestTarget(request.target)
    guard let app = findRunningApplication(target) else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS control host focus failed.",
            code: "target_not_found",
            error: "Application target was not found."
        )
    }

    let activated = app.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
    let processId = Int(app.processIdentifier)
    return response(
        ok: activated,
        action: request.action,
        message: activated ? "macOS control host focus completed." : "macOS control host focus failed.",
        processId: processId,
        windows: listWindows(target: target, processId: processId),
        code: activated ? nil : "host_failed",
        error: activated ? nil : "Application activation failed."
    )
}

func inspectAccessibility(_ request: HostRequest) -> HostResponse {
    if !AXIsProcessTrusted() {
        return accessibilityPermissionDenied(action: request.action)
    }

    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    guard let app = findRunningApplication(target) else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS accessibility inspect failed.",
            code: "target_not_found",
            error: "Application target was not found.",
            providers: providerStatus()
        )
    }

    let processId = Int(app.processIdentifier)
    let windows = listWindows(target: target, processId: processId)
    let root = AXUIElementCreateApplication(app.processIdentifier)
    var traversal = AXTraversalState(remaining: max(1, options.limit))
    let depth = options.includeTreePreview ? max(1, min(options.depth, 3)) : 0
    let element = buildAccessibilityElement(root, pid: app.processIdentifier, path: "0", depth: depth, state: &traversal, includeValues: options.includeValues)

    return response(
        ok: true,
        action: request.action,
        message: "macOS accessibility inspect completed.",
        processId: processId,
        windows: windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: processId, windows: windows),
        observationMode: "inspect",
        observation: element,
        element: element,
        tree: element.children,
        truncated: traversal.truncated
    )
}

func treeAccessibility(_ request: HostRequest) -> HostResponse {
    if !AXIsProcessTrusted() {
        return accessibilityPermissionDenied(action: request.action)
    }

    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    guard let app = findRunningApplication(target) else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS accessibility tree failed.",
            code: "target_not_found",
            error: "Application target was not found.",
            providers: providerStatus()
        )
    }

    let processId = Int(app.processIdentifier)
    let windows = listWindows(target: target, processId: processId)
    let root = AXUIElementCreateApplication(app.processIdentifier)
    var traversal = AXTraversalState(remaining: max(1, options.limit))
    let depth = options.includeFullTree ? max(1, options.depth) : max(1, min(options.depth, 5))
    let element = buildAccessibilityElement(root, pid: app.processIdentifier, path: "0", depth: depth, state: &traversal, includeValues: options.includeValues)

    return response(
        ok: true,
        action: request.action,
        message: "macOS accessibility tree completed.",
        processId: processId,
        windows: windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: processId, windows: windows),
        observationMode: "tree",
        observation: element,
        tree: [element],
        truncated: traversal.truncated
    )
}

func elementFromPointAccessibility(_ request: HostRequest) -> HostResponse {
    if !AXIsProcessTrusted() {
        return accessibilityPermissionDenied(action: request.action)
    }

    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    guard let x = target.x, let y = target.y else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS accessibility elementFromPoint failed.",
            code: "invalid_target",
            error: "x and y coordinates are required.",
            providers: providerStatus()
        )
    }

    let systemWide = AXUIElementCreateSystemWide()
    var rawElement: AXUIElement?
    let copyError = AXUIElementCopyElementAtPosition(systemWide, Float(x), Float(y), &rawElement)
    guard copyError == .success, let elementAtPoint = rawElement else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS accessibility elementFromPoint failed.",
            code: "target_not_found",
            error: "No accessibility element was found at the requested point.",
            providers: providerStatus()
        )
    }

    var pid = pid_t(0)
    _ = AXUIElementGetPid(elementAtPoint, &pid)
    let processId = pid > 0 ? Int(pid) : nil
    let windows = listWindows(target: target, processId: processId)
    var traversal = AXTraversalState(remaining: max(1, min(options.limit, 20)))
    let element = buildAccessibilityElement(elementAtPoint, pid: pid, path: "point", depth: 0, state: &traversal, includeValues: options.includeValues)

    return response(
        ok: true,
        action: request.action,
        message: "macOS accessibility elementFromPoint completed.",
        processId: processId,
        windows: windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: processId, windows: windows),
        observationMode: "elementFromPoint",
        observation: element,
        element: element,
        tree: nil,
        truncated: traversal.truncated
    )
}

func accessibilityPermissionDenied(action: String) -> HostResponse {
    response(
        ok: false,
        action: action,
        message: "macOS accessibility permission is required.",
        code: "permission_denied",
        error: "Enable Accessibility permission for Xenesis Desk or the macOS control host.",
        providers: providerStatus(),
        permissions: [
            "accessibility": "denied",
            "screenRecording": "unknown",
            "automation": "unknown"
        ],
        warnings: ["macOS Accessibility permission is required for AX observation."]
    )
}

struct AXTraversalState {
    var remaining: Int
    var truncated: Bool = false
}

func buildAccessibilityElement(
    _ element: AXUIElement,
    pid: pid_t,
    path: String,
    depth: Int,
    state: inout AXTraversalState,
    includeValues: Bool
) -> HostElement {
    if state.remaining <= 0 {
        state.truncated = true
        return HostElement(
            elementRef: "ax:pid=\(pid);path=\(path)",
            provider: "ax",
            name: nil,
            role: nil,
            value: nil,
            automationId: nil,
            className: nil,
            controlType: nil,
            state: nil,
            bounds: nil,
            children: nil,
            childCount: nil,
            truncated: true,
            source: "ax",
            confidence: 0.6
        )
    }

    state.remaining -= 1
    let role = axStringAttribute(element, kAXRoleAttribute)
    let children = axChildren(element)
    var encodedChildren: [HostElement]? = nil

    if depth > 0 && !children.isEmpty {
        var items: [HostElement] = []
        for (index, child) in children.enumerated() {
            if state.remaining <= 0 {
                state.truncated = true
                break
            }
            items.append(
                buildAccessibilityElement(
                    child,
                    pid: pid,
                    path: "\(path).\(index)",
                    depth: depth - 1,
                    state: &state,
                    includeValues: includeValues
                )
            )
        }
        if !items.isEmpty {
            encodedChildren = items
        }
    }

    let localTruncated = state.truncated || (depth > 0 && (encodedChildren?.count ?? 0) < children.count)
    if localTruncated {
        state.truncated = true
    }

    return HostElement(
        elementRef: "ax:pid=\(pid);path=\(path);role=\(role ?? "unknown")",
        provider: "ax",
        name: axStringAttribute(element, kAXTitleAttribute) ?? axStringAttribute(element, kAXDescriptionAttribute),
        role: role,
        value: includeValues ? axStringAttribute(element, kAXValueAttribute) : nil,
        automationId: nil,
        className: nil,
        controlType: role,
        state: axState(element),
        bounds: axBounds(element),
        children: encodedChildren,
        childCount: children.count,
        truncated: localTruncated ? true : nil,
        source: "ax",
        confidence: 0.85
    )
}

func axStringAttribute(_ element: AXUIElement, _ attribute: CFString) -> String? {
    var raw: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, attribute, &raw) == .success, let value = raw else {
        return nil
    }
    if let string = value as? String {
        return string.isEmpty ? nil : string
    }
    if let number = value as? NSNumber {
        return number.stringValue
    }
    let described = String(describing: value)
    return described.isEmpty ? nil : described
}

func axBoolAttribute(_ element: AXUIElement, _ attribute: CFString) -> Bool? {
    var raw: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, attribute, &raw) == .success, let value = raw else {
        return nil
    }
    if let bool = value as? Bool {
        return bool
    }
    if let number = value as? NSNumber {
        return number.boolValue
    }
    return nil
}

func axChildren(_ element: AXUIElement) -> [AXUIElement] {
    var raw: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, kAXChildrenAttribute, &raw) == .success else {
        return []
    }
    return raw as? [AXUIElement] ?? []
}

func axState(_ element: AXUIElement) -> [String]? {
    var values: [String] = []
    if let focused = axBoolAttribute(element, kAXFocusedAttribute), focused {
        values.append("focused")
    }
    if let enabled = axBoolAttribute(element, kAXEnabledAttribute) {
        values.append(enabled ? "enabled" : "disabled")
    }
    return values.isEmpty ? nil : values
}

func axBounds(_ element: AXUIElement) -> HostBounds? {
    guard let point = axPointAttribute(element, kAXPositionAttribute),
          let size = axSizeAttribute(element, kAXSizeAttribute) else {
        return nil
    }
    return HostBounds(
        x: Int(point.x.rounded()),
        y: Int(point.y.rounded()),
        width: Int(size.width.rounded()),
        height: Int(size.height.rounded())
    )
}

func axPointAttribute(_ element: AXUIElement, _ attribute: CFString) -> CGPoint? {
    var raw: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, attribute, &raw) == .success,
          let value = raw as? AXValue else {
        return nil
    }
    var point = CGPoint.zero
    guard AXValueGetValue(value, .cgPoint, &point) else {
        return nil
    }
    return point
}

func axSizeAttribute(_ element: AXUIElement, _ attribute: CFString) -> CGSize? {
    var raw: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, attribute, &raw) == .success,
          let value = raw as? AXValue else {
        return nil
    }
    var size = CGSize.zero
    guard AXValueGetValue(value, .cgSize, &size) else {
        return nil
    }
    return size
}

func hostTarget(_ target: RequestTarget, processId: Int?, windows: [HostWindow]) -> HostTarget {
    let window = windows.first
    return HostTarget(
        appId: target.appId,
        windowId: target.windowId ?? window?.windowId,
        processId: processId ?? window?.processId,
        processName: target.processName,
        title: target.titleContains ?? window?.title,
        className: nil,
        bounds: window?.bounds
    )
}

func pointerInput(_ request: HostRequest) -> HostResponse {
    if !AXIsProcessTrusted() {
        return accessibilityPermissionDenied(action: request.action)
    }

    let target = RequestTarget(request.target)
    let prepared = prepareInputTarget(target, action: request.action)
    if let failure = prepared.failure {
        return failure
    }
    guard let x = target.x, let y = target.y else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS pointer input failed.",
            code: "invalid_target",
            error: "x and y coordinates are required.",
            providers: providerStatus()
        )
    }

    let point = CGPoint(x: x, y: y)
    switch request.action {
    case "move":
        postMouseEvent(type: .mouseMoved, point: point, button: .left)
    case "mouseDown":
        postMouseEvent(type: .leftMouseDown, point: point, button: .left)
    case "mouseUp":
        postMouseEvent(type: .leftMouseUp, point: point, button: .left)
    case "rightClick":
        postClick(point: point, button: .right, clickCount: 1)
    case "middleClick":
        postClick(point: point, button: .center, clickCount: 1)
    case "doubleClick":
        postClick(point: point, button: .left, clickCount: 2)
    case "tripleClick":
        postClick(point: point, button: .left, clickCount: 3)
    default:
        postClick(point: point, button: .left, clickCount: 1)
    }

    return response(
        ok: true,
        action: request.action,
        message: "macOS pointer input completed.",
        processId: prepared.processId,
        windows: prepared.windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: prepared.processId, windows: prepared.windows)
    )
}

func dragInput(_ request: HostRequest) -> HostResponse {
    if !AXIsProcessTrusted() {
        return accessibilityPermissionDenied(action: request.action)
    }

    let target = RequestTarget(request.target)
    let prepared = prepareInputTarget(target, action: request.action)
    if let failure = prepared.failure {
        return failure
    }
    guard let startX = target.startX, let startY = target.startY, let endX = target.endX, let endY = target.endY else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS drag input failed.",
            code: "invalid_target",
            error: "startX, startY, endX, and endY coordinates are required.",
            providers: providerStatus()
        )
    }

    let start = CGPoint(x: startX, y: startY)
    let end = CGPoint(x: endX, y: endY)
    postMouseEvent(type: .mouseMoved, point: start, button: .left)
    postMouseEvent(type: .leftMouseDown, point: start, button: .left)
    postMouseEvent(type: .leftMouseDragged, point: end, button: .left)
    postMouseEvent(type: .leftMouseUp, point: end, button: .left)

    return response(
        ok: true,
        action: request.action,
        message: "macOS drag input completed.",
        processId: prepared.processId,
        windows: prepared.windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: prepared.processId, windows: prepared.windows)
    )
}

func typeTextInput(_ request: HostRequest) -> HostResponse {
    if !AXIsProcessTrusted() {
        return accessibilityPermissionDenied(action: request.action)
    }

    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    let prepared = prepareInputTarget(target, action: request.action)
    if let failure = prepared.failure {
        return failure
    }
    guard let text = options.text, !text.isEmpty else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS text input failed.",
            code: "invalid_target",
            error: "text is required.",
            providers: providerStatus()
        )
    }

    postUnicodeText(text)
    return response(
        ok: true,
        action: request.action,
        message: "macOS text input completed.",
        processId: prepared.processId,
        windows: prepared.windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: prepared.processId, windows: prepared.windows)
    )
}

func hotkeyInput(_ request: HostRequest) -> HostResponse {
    if !AXIsProcessTrusted() {
        return accessibilityPermissionDenied(action: request.action)
    }

    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    let prepared = prepareInputTarget(target, action: request.action)
    if let failure = prepared.failure {
        return failure
    }
    guard let keyCode = keyCodeForHotkey(options.keys) else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS hotkey input failed.",
            code: "invalid_target",
            error: "A supported non-modifier key is required.",
            providers: providerStatus()
        )
    }

    let flags = modifierFlags(options.keys)
    postKeyCode(keyCode, flags: flags)
    return response(
        ok: true,
        action: request.action,
        message: "macOS hotkey input completed.",
        processId: prepared.processId,
        windows: prepared.windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: prepared.processId, windows: prepared.windows)
    )
}

func prepareInputTarget(_ target: RequestTarget, action: String) -> (processId: Int?, windows: [HostWindow], failure: HostResponse?) {
    if !hasExplicitTarget(target) {
        return (nil, [], nil)
    }
    guard let app = findRunningApplication(target) else {
        return (
            nil,
            [],
            response(
                ok: false,
                action: action,
                message: "macOS input target focus failed.",
                code: "target_focus_failed",
                error: "Application target was not found.",
                providers: providerStatus()
            )
        )
    }

    let activated = app.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
    let processId = Int(app.processIdentifier)
    let windows = listWindows(target: target, processId: processId)
    if !activated {
        return (
            processId,
            windows,
            response(
                ok: false,
                action: action,
                message: "macOS input target focus failed.",
                processId: processId,
                windows: windows,
                code: "target_focus_failed",
                error: "Application activation failed.",
                providers: providerStatus(),
                target: hostTarget(target, processId: processId, windows: windows)
            )
        )
    }
    return (processId, windows, nil)
}

func hasExplicitTarget(_ target: RequestTarget) -> Bool {
    target.bundleId != nil ||
        target.executable != nil ||
        target.path != nil ||
        target.processName != nil ||
        target.titleContains != nil ||
        target.windowId != nil
}

func postClick(point: CGPoint, button: CGMouseButton, clickCount: Int) {
    let downType = mouseDownType(button)
    let upType = mouseUpType(button)
    for count in 1...clickCount {
        postMouseEvent(type: downType, point: point, button: button, clickState: count)
        postMouseEvent(type: upType, point: point, button: button, clickState: count)
    }
}

func postMouseEvent(type: CGEventType, point: CGPoint, button: CGMouseButton, clickState: Int = 1) {
    guard let event = CGEventCreateMouseEvent(nil, type, point, button) else {
        return
    }
    event.setIntegerValueField(.mouseEventClickState, value: Int64(clickState))
    CGEventPost(.cghidEventTap, event)
}

func mouseDownType(_ button: CGMouseButton) -> CGEventType {
    switch button {
    case .right:
        return .rightMouseDown
    case .center:
        return .otherMouseDown
    default:
        return .leftMouseDown
    }
}

func mouseUpType(_ button: CGMouseButton) -> CGEventType {
    switch button {
    case .right:
        return .rightMouseUp
    case .center:
        return .otherMouseUp
    default:
        return .leftMouseUp
    }
}

func postUnicodeText(_ text: String) {
    let units = Array(text.utf16)
    units.withUnsafeBufferPointer { buffer in
        guard let baseAddress = buffer.baseAddress,
              let down = CGEventCreateKeyboardEvent(nil, 0, true),
              let up = CGEventCreateKeyboardEvent(nil, 0, false) else {
            return
        }
        CGEventKeyboardSetUnicodeString(down, units.count, baseAddress)
        CGEventKeyboardSetUnicodeString(up, units.count, baseAddress)
        CGEventPost(.cghidEventTap, down)
        CGEventPost(.cghidEventTap, up)
    }
}

func postKeyCode(_ keyCode: CGKeyCode, flags: CGEventFlags) {
    guard let down = CGEventCreateKeyboardEvent(nil, keyCode, true),
          let up = CGEventCreateKeyboardEvent(nil, keyCode, false) else {
        return
    }
    down.flags = flags
    up.flags = flags
    CGEventPost(.cghidEventTap, down)
    CGEventPost(.cghidEventTap, up)
}

func modifierFlags(_ keys: [String]) -> CGEventFlags {
    var flags = CGEventFlags()
    for key in keys.map({ $0.uppercased() }) {
        switch key {
        case "COMMAND", "CMD", "META":
            flags.insert(.maskCommand)
        case "CONTROL", "CTRL":
            flags.insert(.maskControl)
        case "OPTION", "ALT":
            flags.insert(.maskAlternate)
        case "SHIFT":
            flags.insert(.maskShift)
        default:
            continue
        }
    }
    return flags
}

func keyCodeForHotkey(_ keys: [String]) -> CGKeyCode? {
    for key in keys.reversed() {
        if let code = keyCode(key) {
            return code
        }
    }
    return nil
}

func keyCode(_ key: String) -> CGKeyCode? {
    switch key.uppercased() {
    case "A": return 0
    case "S": return 1
    case "D": return 2
    case "F": return 3
    case "H": return 4
    case "G": return 5
    case "Z": return 6
    case "X": return 7
    case "C": return 8
    case "V": return 9
    case "B": return 11
    case "Q": return 12
    case "W": return 13
    case "E": return 14
    case "R": return 15
    case "Y": return 16
    case "T": return 17
    case "1": return 18
    case "2": return 19
    case "3": return 20
    case "4": return 21
    case "6": return 22
    case "5": return 23
    case "=": return 24
    case "9": return 25
    case "7": return 26
    case "-": return 27
    case "8": return 28
    case "0": return 29
    case "]": return 30
    case "O": return 31
    case "U": return 32
    case "[": return 33
    case "I": return 34
    case "P": return 35
    case "L": return 37
    case "J": return 38
    case "'": return 39
    case "K": return 40
    case ";": return 41
    case "\\": return 42
    case ",": return 43
    case "/": return 44
    case "N": return 45
    case "M": return 46
    case ".": return 47
    case "RETURN", "ENTER": return 36
    case "TAB": return 48
    case "SPACE": return 49
    case "DELETE", "BACKSPACE": return 51
    case "ESC", "ESCAPE": return 53
    case "LEFT": return 123
    case "RIGHT": return 124
    case "DOWN": return 125
    case "UP": return 126
    default: return nil
    }
}

struct VisualTargetResolution {
    let bounds: HostBounds?
    let windowId: CGWindowID?
    let processId: Int?
    let windows: [HostWindow]
    let source: String
    let warnings: [String]
}

func screenshotCapture(_ request: HostRequest) -> HostResponse {
    captureTarget(request, elementMode: false)
}

func elementCapture(_ request: HostRequest) -> HostResponse {
    captureTarget(request, elementMode: true)
}

func captureTarget(_ request: HostRequest, elementMode: Bool) -> HostResponse {
    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    let resolved = resolveVisualTarget(target)
    guard let bounds = resolved.bounds else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS capture failed.",
            processId: resolved.processId,
            windows: resolved.windows,
            code: "target_not_found",
            error: "No target bounds were found for capture.",
            providers: providerStatus(),
            warnings: resolved.warnings
        )
    }

    let path = options.screenshotPath ?? defaultCapturePath()
    guard let image = captureImage(bounds: bounds, windowId: resolved.windowId) else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS capture failed.",
            processId: resolved.processId,
            windows: resolved.windows,
            code: "screen_recording_permission_required",
            error: "Screen Recording permission is required or the target capture returned no pixels.",
            providers: providerStatus(),
            target: hostTarget(target, processId: resolved.processId, windows: resolved.windows),
            warnings: resolved.warnings + ["Capture returned no image."]
        )
    }

    guard writePng(image, path: path) else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS capture failed.",
            processId: resolved.processId,
            windows: resolved.windows,
            code: "capture_failed",
            error: "Failed to write PNG output.",
            providers: providerStatus(),
            target: hostTarget(target, processId: resolved.processId, windows: resolved.windows),
            warnings: resolved.warnings
        )
    }

    let screenshot = HostScreenshot(
        path: path,
        dataUrl: nil,
        mimeType: "image/png",
        width: image.width,
        height: image.height,
        bounds: bounds,
        elementRef: elementMode ? target.elementRef : nil,
        source: resolved.source,
        confidence: resolved.source == "ax" ? 0.8 : 0.7
    )

    return response(
        ok: true,
        action: request.action,
        message: "macOS capture completed.",
        processId: resolved.processId,
        windows: resolved.windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: resolved.processId, windows: resolved.windows),
        screenshotPath: path,
        screenshot: screenshot,
        warnings: resolved.warnings.isEmpty ? nil : resolved.warnings
    )
}

func highlightTarget(_ request: HostRequest) -> HostResponse {
    let target = RequestTarget(request.target)
    let options = RequestOptions(request.options)
    let resolved = resolveVisualTarget(target)
    guard let bounds = resolved.bounds else {
        return response(
            ok: false,
            action: request.action,
            message: "macOS highlight failed.",
            processId: resolved.processId,
            windows: resolved.windows,
            code: "highlight_failed",
            error: "No target bounds were found for highlight.",
            providers: providerStatus(),
            warnings: resolved.warnings
        )
    }

    showHighlight(bounds: bounds, durationMs: max(100, options.durationMs))
    let highlight = HostHighlight(
        bounds: bounds,
        elementRef: target.elementRef,
        durationMs: options.durationMs,
        source: resolved.source,
        confidence: resolved.source == "ax" ? 0.8 : 0.7
    )

    return response(
        ok: true,
        action: request.action,
        message: "macOS highlight completed.",
        processId: resolved.processId,
        windows: resolved.windows,
        providers: providerStatus(),
        target: hostTarget(target, processId: resolved.processId, windows: resolved.windows),
        highlight: highlight,
        warnings: resolved.warnings.isEmpty ? nil : resolved.warnings
    )
}

func resolveVisualTarget(_ target: RequestTarget) -> VisualTargetResolution {
    var warnings: [String] = []
    if let elementRef = target.elementRef {
        if let elementBounds = boundsForElementRef(elementRef) {
            return VisualTargetResolution(
                bounds: elementBounds,
                windowId: nil,
                processId: processIdFromElementRef(elementRef),
                windows: [],
                source: "ax",
                warnings: warnings
            )
        }
        warnings.append("Element bounds could not be resolved; falling back to window bounds.")
    }

    let app = hasExplicitTarget(target) ? findRunningApplication(target) : NSWorkspace.shared.frontmostApplication
    let processId = app.map { Int($0.processIdentifier) }
    let windows = listWindows(target: target, processId: processId)
    if let window = windows.first, let bounds = window.bounds {
        return VisualTargetResolution(
            bounds: bounds,
            windowId: CGWindowID(UInt32(window.windowId) ?? 0),
            processId: processId,
            windows: windows,
            source: "cgwindow",
            warnings: warnings
        )
    }

    if !hasExplicitTarget(target), let screen = NSScreen.main {
        let frame = screen.frame
        return VisualTargetResolution(
            bounds: HostBounds(
                x: Int(frame.origin.x.rounded()),
                y: Int(frame.origin.y.rounded()),
                width: Int(frame.size.width.rounded()),
                height: Int(frame.size.height.rounded())
            ),
            windowId: nil,
            processId: processId,
            windows: windows,
            source: "cgwindow",
            warnings: warnings + ["No window target was provided; captured the main screen bounds."]
        )
    }

    return VisualTargetResolution(
        bounds: nil,
        windowId: nil,
        processId: processId,
        windows: windows,
        source: "cgwindow",
        warnings: warnings
    )
}

func captureImage(bounds: HostBounds, windowId: CGWindowID?) -> CGImage? {
    if let windowId, windowId != 0 {
        return CGWindowListCreateImage(.null, .optionIncludingWindow, windowId, [.boundsIgnoreFraming, .bestResolution])
    }
    return CGWindowListCreateImage(bounds.cgRect, .optionOnScreenOnly, kCGNullWindowID, [.bestResolution])
}

func writePng(_ image: CGImage, path: String) -> Bool {
    let url = URL(fileURLWithPath: path)
    do {
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(),
            withIntermediateDirectories: true,
            attributes: nil
        )
        let bitmap = NSBitmapImageRep(cgImage: image)
        guard let data = bitmap.representation(using: .png, properties: [:]) else {
            return false
        }
        try data.write(to: url)
        return true
    } catch {
        return false
    }
}

func defaultCapturePath() -> String {
    URL(fileURLWithPath: NSTemporaryDirectory())
        .appendingPathComponent("xenesis-macos-capture-\(UUID().uuidString).png")
        .path
}

func showHighlight(bounds: HostBounds, durationMs: Int) {
    NSApplication.shared.setActivationPolicy(.accessory)
    let rect = bounds.cgRect
    let panel = NSPanel(
        contentRect: rect,
        styleMask: [.borderless, .nonactivatingPanel],
        backing: .buffered,
        defer: false
    )
    panel.backgroundColor = .clear
    panel.isOpaque = false
    panel.hasShadow = false
    panel.ignoresMouseEvents = true
    panel.level = .screenSaver
    panel.contentView = HighlightBorderView(frame: NSRect(origin: .zero, size: rect.size))
    panel.orderFrontRegardless()
    RunLoop.current.run(until: Date().addingTimeInterval(Double(durationMs) / 1000.0))
    panel.close()
}

final class HighlightBorderView: NSView {
    override func draw(_ dirtyRect: NSRect) {
        NSColor.systemCyan.setStroke()
        let path = NSBezierPath(rect: bounds.insetBy(dx: 2, dy: 2))
        path.lineWidth = 4
        path.stroke()
    }
}

func boundsForElementRef(_ elementRef: String) -> HostBounds? {
    guard AXIsProcessTrusted(),
          let pid = processIdFromElementRef(elementRef),
          let path = pathFromElementRef(elementRef) else {
        return nil
    }

    var element = AXUIElementCreateApplication(pid_t(pid))
    for index in path.dropFirst() {
        let children = axChildren(element)
        guard index >= 0, index < children.count else {
            return nil
        }
        element = children[index]
    }
    return axBounds(element)
}

func processIdFromElementRef(_ elementRef: String) -> Int? {
    guard let range = elementRef.range(of: "pid=") else {
        return nil
    }
    let tail = elementRef[range.upperBound...]
    let digits = tail.prefix { $0.isNumber }
    return Int(digits)
}

func pathFromElementRef(_ elementRef: String) -> [Int]? {
    guard let range = elementRef.range(of: "path=") else {
        return nil
    }
    let tail = elementRef[range.upperBound...]
    let pathText = tail.split(separator: ";", maxSplits: 1).first ?? Substring(tail)
    let parts = pathText.split(separator: ".")
    let indexes = parts.compactMap { Int($0) }
    return indexes.count == parts.count ? indexes : nil
}

extension HostBounds {
    var cgRect: CGRect {
        CGRect(x: x, y: y, width: width, height: height)
    }
}

func applicationURL(_ target: RequestTarget) -> URL? {
    if let bundleId = target.bundleId,
       let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) {
        return url
    }
    if let path = target.path ?? target.executable {
        return URL(fileURLWithPath: path)
    }
    return nil
}

func findRunningApplication(_ target: RequestTarget) -> NSRunningApplication? {
    let apps = NSWorkspace.shared.runningApplications
    if let bundleId = target.bundleId {
        return apps.first { $0.bundleIdentifier == bundleId }
    }
    if let path = target.path ?? target.executable {
        return apps.first { $0.bundleURL?.path == path || $0.executableURL?.path == path }
    }
    if let processName = target.processName {
        let lowered = processName.lowercased()
        return apps.first { ($0.localizedName ?? "").lowercased().contains(lowered) }
    }
    return NSWorkspace.shared.frontmostApplication
}

func listWindows(target: RequestTarget, processId: Int? = nil) -> [HostWindow] {
    let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
    let raw = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] ?? []
    let frontPid = NSWorkspace.shared.frontmostApplication.map { Int($0.processIdentifier) }
    return raw.compactMap { item in
        guard let ownerPid = item[kCGWindowOwnerPID as String] as? Int else {
            return nil
        }
        if let processId, ownerPid != processId {
            return nil
        }
        if let titleContains = target.titleContains {
            let title = item[kCGWindowName as String] as? String ?? ""
            if !title.localizedCaseInsensitiveContains(titleContains) {
                return nil
            }
        }
        if let windowId = target.windowId,
           String(describing: item[kCGWindowNumber as String] ?? "") != windowId {
            return nil
        }

        let number = item[kCGWindowNumber as String].map { String(describing: $0) } ?? ""
        if number.isEmpty {
            return nil
        }
        let title = item[kCGWindowName as String] as? String ?? ""
        let bounds = windowBounds(item[kCGWindowBounds as String])
        return HostWindow(
            windowId: number,
            processId: ownerPid,
            title: title,
            bounds: bounds,
            isForeground: frontPid == ownerPid
        )
    }
}

func windowBounds(_ raw: Any?) -> HostBounds? {
    guard let dictionary = raw as? [String: Any] else {
        return nil
    }
    return HostBounds(
        x: numberValue(dictionary["X"]),
        y: numberValue(dictionary["Y"]),
        width: numberValue(dictionary["Width"]),
        height: numberValue(dictionary["Height"])
    )
}

func numberValue(_ raw: Any?) -> Int {
    if let number = raw as? NSNumber {
        return number.intValue
    }
    if let double = raw as? Double {
        return Int(double.rounded())
    }
    if let int = raw as? Int {
        return int
    }
    return 0
}

func write(_ response: HostResponse) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    do {
        let data = try encoder.encode(response)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    } catch {
        let fallback = #"{"ok":false,"action":"unknown","approvalLevel":"low","windows":[],"code":"host_failed","error":"Failed to encode host response.","message":"macOS control host failed."}"#
        FileHandle.standardOutput.write(Data(fallback.utf8))
        FileHandle.standardOutput.write(Data("\n".utf8))
    }
}

let input = FileHandle.standardInput.readDataToEndOfFile()
let decoder = JSONDecoder()

do {
    let request = try decoder.decode(HostRequest.self, from: input)
    write(handle(request))
} catch {
    write(
        response(
            ok: false,
            action: "unknown",
            message: "macOS control host request decoding failed.",
            code: "host_invalid_json",
            error: "Failed to decode host request."
        )
    )
}

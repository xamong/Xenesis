// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "XenesisMacosControlHost",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "xenesis-macos-control-host",
            targets: ["XenesisMacosControlHost"]
        )
    ],
    targets: [
        .executableTarget(
            name: "XenesisMacosControlHost"
        )
    ]
)

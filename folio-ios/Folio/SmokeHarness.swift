import UIKit
import WebKit

#if DEBUG && targetEnvironment(simulator)
@MainActor
final class SmokeHarness {
    private unowned let controller: FolioViewController
    private var results: [[String: Any]] = []
    private var images: [String] = []
    private let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("FolioQA")

    init(controller: FolioViewController) { self.controller = controller }

    private func js(_ body: String, arguments: [String: Any] = [:]) async throws -> Any {
        try await withCheckedThrowingContinuation { continuation in
            controller.web.callAsyncJavaScript(body, arguments: arguments, in: nil, in: .page) { continuation.resume(with: $0) }
        }
    }

    private func screenshot(_ name: String) async throws {
        let image: UIImage = try await withCheckedThrowingContinuation { continuation in
            let config = WKSnapshotConfiguration()
            config.afterScreenUpdates = true
            controller.web.takeSnapshot(with: config) { image, error in
                if let image = image { continuation.resume(returning: image) }
                else { continuation.resume(throwing: error ?? NSError(domain: "FolioSnapshot", code: 1)) }
            }
        }
        guard let png = image.pngData() else { throw NSError(domain: "FolioSnapshot", code: 2) }
        try png.write(to: folder.appendingPathComponent(name + ".png"), options: .atomic)
        images.append(name + ".png")
    }

    func run() async {
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            guard let scriptURL = Bundle.main.url(forResource: "qa-tests", withExtension: "js", subdirectory: "QA") else { throw NSError(domain: "FolioQA", code: 1) }
            let script = try String(contentsOf: scriptURL, encoding: .utf8)
            _ = try await js(script + "\nreturn await FolioIOSQA.prepare();")
            for theme in ["light", "dark"] {
                for page in ["home", "workbench", "calendar", "timetable", "courses", "exams", "grades", "relationships", "settings"] {
                    _ = try await js("return await FolioIOSQA.page(page,theme);", arguments: ["page": page, "theme": theme])
                    try await screenshot("\(theme)-\(page)")
                }
            }
            _ = try await js("return await FolioIOSQA.interactions();")
            try await screenshot("light-confirmation")
            guard let json = try await js("return JSON.stringify(FolioIOSQA.result());") as? String,
                  let bytes = json.data(using: .utf8), let report = try JSONSerialization.jsonObject(with: bytes) as? [String: Any] else { throw NSError(domain: "FolioQA", code: 2) }
            results = report["checks"] as? [[String: Any]] ?? []
            try save(error: nil, webReport: report)
            _ = try await js("FolioChatUI.closePanel();FolioTheme.set('light');showPreviewScreen('home',{focus:false});return true;")
            controller.qaStatus.text = "passed|home"
            _ = try await js("FolioIOSQA.enableNavigationStatus();return true;")
        } catch {
            try? await screenshot("failure")
            try? save(error: error.localizedDescription, webReport: [:])
            controller.qaStatus.text = "failed|\(error.localizedDescription)"
        }
    }

    private func save(error: String?, webReport: [String: Any]) throws {
        let value: [String: Any] = ["engine": "iOS WKWebView", "simulator": true, "fixtureData": true,
                                  "passed": error == nil, "error": error ?? "", "checks": results,
                                  "screenshots": images, "web": webReport,
                                  "systemVersion": UIDevice.current.systemVersion,
                                  "viewport": ["width": controller.web.bounds.width, "height": controller.web.bounds.height]]
        try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys]).write(to: folder.appendingPathComponent("report.json"), options: .atomic)
    }
}
#endif

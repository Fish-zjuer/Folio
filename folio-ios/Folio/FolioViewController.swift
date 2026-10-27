import UIKit
import WebKit

final class FolioViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private(set) var web: WKWebView!
    private var server: LocalAssetServer?
    private var startedQA = false
    let qaStatus = UILabel()
    private(set) var simulatorQA = false
    private var darkChrome = false
    private lazy var services = NativeServices(controller: self)
    private var requests: [String: Task<Void, Never>] = [:]
    override var preferredStatusBarStyle: UIStatusBarStyle { darkChrome ? .lightContent : .darkContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        #if DEBUG && targetEnvironment(simulator)
        simulatorQA = ProcessInfo.processInfo.arguments.contains("--folio-simulator-qa")
        #endif
        view.backgroundColor = UIColor(red: 249/255, green: 249/255, blue: 247/255, alpha: 1)
        NotificationCenter.default.addObserver(self, selector: #selector(openPendingReminder), name: .init("FolioOpenReminder"), object: nil)
        let content = WKUserContentController()
        content.add(self, name: "folio")
        if simulatorQA { content.add(self, name: "qa") }
        var scripts = [resource("ios-bridge", folder: "HostAssets")]
        #if DEBUG && targetEnvironment(simulator)
        if simulatorQA { scripts += [resource("native-fixture", folder: "QA"), resource("qa-seed", folder: "QA")] }
        #endif
        for script in scripts { content.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true)) }
        let config = WKWebViewConfiguration()
        config.userContentController = content
        config.websiteDataStore = simulatorQA ? .nonPersistent() : .default()
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.accessibilityIdentifier = "folio.web"
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor)
        ])
        if simulatorQA {
            qaStatus.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            qaStatus.textColor = .clear
            qaStatus.font = .systemFont(ofSize: 1)
            qaStatus.isAccessibilityElement = true
            qaStatus.accessibilityIdentifier = "folio.qa.status"
            qaStatus.text = "starting"
            view.addSubview(qaStatus)
        }
        guard let assets = Bundle.main.url(forResource: "WebAssets", withExtension: nil) else { fail("缺少网页资源"); return }
        let server = LocalAssetServer(root: assets)
        self.server = server
        server.start { [weak self] result in
            switch result {
            case .success: self?.web.load(URLRequest(url: URL(string: LocalAssetServer.origin + "/index.html")!))
            case .failure(let error): self?.fail("本地页面服务无法启动：\(error.localizedDescription)")
            }
        }
    }

    private func resource(_ name: String, folder: String) -> String {
        guard let url = Bundle.main.url(forResource: name, withExtension: "js", subdirectory: folder), let value = try? String(contentsOf: url, encoding: .utf8) else { return "" }
        return value
    }

    private func fail(_ message: String) {
        qaStatus.text = "failed|\(message)"
        let text = UILabel(frame: view.bounds.insetBy(dx: 24, dy: 80)); text.numberOfLines = 0; text.text = message; view.addSubview(text)
    }

    private func trusted(_ url: URL?) -> Bool {
        guard let url = url else { return false }
        return url.scheme == "http" && url.host == "127.0.0.1" && url.port == Int(LocalAssetServer.port)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, trusted(message.frameInfo.request.url), let body = message.body as? [String: Any] else { return }
        if message.name == "qa", simulatorQA { qaStatus.text = body["status"] as? String; return }
        guard let id = body["id"] as? String, id.count < 100, let operation = body["operation"] as? String, let payload = body["payload"] as? String,
              payload.utf8.count <= 70_000_000, let bytes = payload.data(using: .utf8), let input = (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any] else { return }
        if operation == "cancel" { services.cancel(id); requests[id]?.cancel(); return }
        if operation == "app.chrome" {
            let theme = input.text("theme", "system")
            overrideUserInterfaceStyle = theme == "dark" ? .dark : theme == "light" ? .light : .unspecified
            if let color = input["resolvedColor"] as? String, color.count == 7, color.first == "#", let rgb = UInt32(color.dropFirst(), radix: 16) {
                let red = CGFloat((rgb >> 16) & 255)/255, green = CGFloat((rgb >> 8) & 255)/255, blue = CGFloat(rgb & 255)/255
                view.backgroundColor = UIColor(red: red, green: green, blue: blue, alpha: 1)
                darkChrome = red*0.2126 + green*0.7152 + blue*0.0722 < 0.5
                setNeedsStatusBarAppearanceUpdate()
            }
            reply(id, ["ok": true, "data": JSON()]); return
        }
        guard requests[id] == nil else { return }
        requests[id] = Task { @MainActor [weak self] in
            guard let self = self else { return }
            defer { self.requests.removeValue(forKey: id) }
            do { let value = try await self.services.perform(id, operation, input); if !Task.isCancelled { self.reply(id, ["ok": true, "data": value]) } }
            catch { if !Task.isCancelled { self.reply(id, ["ok": false, "error": error.localizedDescription]) } }
        }
    }

    private func reply(_ id: String, _ result: JSON) {
        guard trusted(web.url) else { return }
        guard let data = try? JSONSerialization.data(withJSONObject: ["id": id, "result": result], options: [.sortedKeys]), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("(()=>{const r=\(json);window.FolioNative?.receive(r.id,r.result)})()", completionHandler: nil)
    }

    func dispatch(_ name: String, detail: JSON = [:]) {
        guard trusted(web?.url), let data = try? jsonBytes(["name": name, "detail": detail]), let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("(()=>{const e=\(json);window.dispatchEvent(new CustomEvent(e.name,{detail:e.detail}))})()", completionHandler: nil)
    }
    func resume() { dispatch("folio-native-resume"); openPendingReminder() }
    @objc private func openPendingReminder() {
        guard trusted(web?.url), let id = UserDefaults.standard.string(forKey: "pendingReminder") else { return }
        UserDefaults.standard.removeObject(forKey: "pendingReminder"); dispatch("folio-open-reminder", detail: ["itemId": id])
    }
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if previousTraitCollection?.userInterfaceStyle != traitCollection.userInterfaceStyle { dispatch("folio-system-theme", detail: ["dark": traitCollection.userInterfaceStyle == .dark]) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if trusted(url) || url.absoluteString == "about:blank" { decisionHandler(.allow) }
        else { decisionHandler(.cancel) }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        dispatch("folio-native-ready")
        openPendingReminder()
        #if DEBUG && targetEnvironment(simulator)
        if simulatorQA && !startedQA {
            startedQA = true
            Task { @MainActor in await SmokeHarness(controller: self).run() }
        }
        #endif
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail(error.localizedDescription) }
}

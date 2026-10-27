import UIKit
import WebKit
import UserNotifications

@MainActor final class NativeAccountEditor: UIViewController {
    let school: NativeSchool
    let initial: JSON
    var completion: ((JSON) -> Void)?
    private let username = UITextField(), password = UITextField(), error = UILabel(), save = UIButton(type: .system)
    private var saving = false
    init(school: NativeSchool, account: JSON) { self.school = school; self.initial = account; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError() }
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = .systemGroupedBackground; title = "学校账号"
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "取消", style: .plain, target: self, action: #selector(cancel))
        isModalInPresentation = true
        let scroll = UIScrollView(); scroll.translatesAutoresizingMaskIntoConstraints = false; scroll.keyboardDismissMode = .interactive
        view.addSubview(scroll)
        NSLayoutConstraint.activate([scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor), scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor), scroll.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor)])
        let stack = UIStackView(); stack.axis = .vertical; stack.spacing = 14; stack.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(stack)
        NSLayoutConstraint.activate([stack.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor, constant: 24), stack.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor, constant: 24), stack.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor, constant: -24), stack.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -24), stack.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor, constant: -48)])
        let note = UILabel(); note.text = "账号和密码仅保存在本机钥匙串"; note.font = .systemFont(ofSize: 13); note.textColor = .secondaryLabel; stack.addArrangedSubview(note)
        username.placeholder = "学号／统一身份认证账号"; username.text = initial.text("username"); username.accessibilityIdentifier = "school.username"
        password.placeholder = initial.flag("hasPassword") ? "密码 · 留空沿用" : "密码"; password.isSecureTextEntry = true; password.accessibilityIdentifier = "school.password"
        for field in [username, password] {
            field.borderStyle = .roundedRect; field.backgroundColor = .secondarySystemGroupedBackground; field.font = .systemFont(ofSize: 17)
            field.autocapitalizationType = .none; field.autocorrectionType = .no; field.spellCheckingType = .no; field.textContentType = nil
            field.heightAnchor.constraint(equalToConstant: 52).isActive = true; stack.addArrangedSubview(field)
        }
        error.numberOfLines = 0; error.font = .systemFont(ofSize: 13); error.textColor = .systemRed; stack.addArrangedSubview(error)
        save.setTitle("保存并同步", for: .normal); save.setTitleColor(.white, for: .normal); save.backgroundColor = UIColor(red: 0.66, green: 0.43, blue: 0.30, alpha: 1); save.layer.cornerRadius = 13
        save.heightAnchor.constraint(equalToConstant: 48).isActive = true; save.addTarget(self, action: #selector(submit), for: .touchUpInside); stack.addArrangedSubview(save)
    }
    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); (initial.flag("hasPassword") ? password : username).becomeFirstResponder() }
    @objc private func cancel() { guard !saving else { return }; finish(["saved": false, "cancelled": true]) }
    func abort() { finish(["saved": false, "cancelled": true]) }
    private func finish(_ result: JSON) { username.text = ""; password.text = ""; let callback = completion; completion = nil; dismiss(animated: true) { callback?(result) } }
    @objc private func submit() {
        guard !saving else { return }
        let user = (username.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines), secret = password.text ?? ""
        guard matches(user, "^[A-Za-z0-9._-]{3,64}$"), !secret.isEmpty || initial.flag("hasPassword") && user == initial.text("username"), secret.count <= 512 else { error.text = "请填写有效学号和密码"; return }
        saving = true; save.isEnabled = false; navigationItem.leftBarButtonItem?.isEnabled = false
        Task { @MainActor in
            do {
                guard try school.account().text("username") == initial.text("username") else { throw FolioFailure("学校账号已改变，请重新填写") }
                var input: JSON = ["username": user]; if !secret.isEmpty { input["password"] = secret }
                let account = try await school.save(input); finish(["saved": true, "account": account])
            } catch { self.error.text = error.localizedDescription; saving = false; save.isEnabled = true; navigationItem.leftBarButtonItem?.isEnabled = true }
        }
    }
}

@MainActor final class NativeSchoolBrowser: UIViewController, WKNavigationDelegate, WKUIDelegate {
    let target: URL
    var finished: (() -> Void)?
    private var web: WKWebView!
    init(target: URL) { self.target = target; super.init(nibName: nil, bundle: nil) }
    required init?(coder: NSCoder) { fatalError() }
    override func viewDidLoad() {
        super.viewDidLoad(); title = "学校官方网页登录"; view.backgroundColor = .systemBackground; isModalInPresentation = true
        navigationItem.leftBarButtonItem = UIBarButtonItem(title: "返回 Folio", style: .plain, target: self, action: #selector(done))
        navigationItem.rightBarButtonItem = UIBarButtonItem(title: "后退", style: .plain, target: self, action: #selector(back))
        let config = WKWebViewConfiguration(); config.websiteDataStore = .default()
        // This WebView deliberately has no Folio message handlers or injected scripts.
        web = WKWebView(frame: .zero, configuration: config); web.navigationDelegate = self; web.uiDelegate = self; web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web); NSLayoutConstraint.activate([web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), web.leadingAnchor.constraint(equalTo: view.leadingAnchor), web.trailingAnchor.constraint(equalTo: view.trailingAnchor), web.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
        web.load(URLRequest(url: target))
    }
    @objc private func back() { if web.canGoBack { web.goBack() } }
    @objc private func done() { web.stopLoading(); let callback = finished; finished = nil; dismiss(animated: true) { callback?() } }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(action.request.url.map(NativeHTTP.trustedSchoolURL) == true ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url, NativeHTTP.trustedSchoolURL(url) { web.load(action.request) }; return nil
    }
}

@MainActor final class NativeFileExport: NSObject, UIDocumentPickerDelegate {
    private var continuation: CheckedContinuation<JSON, Error>?
    private var picker: UIDocumentPickerViewController?
    private var file: URL?
    func cancel() { guard continuation != nil else { return }; picker?.dismiss(animated: true); finish(false) }
    func save(_ file: URL, from presenter: UIViewController) async throws -> JSON {
        guard continuation == nil, presenter.presentedViewController == nil else { throw FolioFailure("请先关闭当前窗口，再保存文件") }
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation; self.file = file
            let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true); self.picker = picker
            picker.delegate = self; presenter.present(picker, animated: true)
        }
    }
    private func finish(_ saved: Bool) {
        let callback = continuation; continuation = nil; picker = nil
        if let file = file { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }; file = nil
        callback?.resume(returning: ["saved": saved, "cancelled": !saved])
    }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finish(!urls.isEmpty) }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finish(false) }
}

@MainActor final class NativeReminders {
    private let center = UNUserNotificationCenter.current()
    private let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    func status() async -> JSON {
        let settings = await center.notificationSettings(), pending = await center.pendingNotificationRequests().filter { $0.identifier.hasPrefix("folio.reminder.") }
        return ["allowed": [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus), "enabled": defaults.bool(forKey: "reminders.enabled"), "exact": true, "pending": pending.count,
                "next": pending.compactMap { ($0.trigger as? UNCalendarNotificationTrigger)?.nextTriggerDate()?.timeIntervalSince1970 }.min().map { $0 * 1000 } ?? 0,
                "through": defaults.double(forKey: "reminders.through"), "deferred": defaults.integer(forKey: "reminders.deferred")]
    }
    func permission() async throws -> JSON { ["requested": true, "allowed": try await center.requestAuthorization(options: [.alert, .sound, .badge])] }
    static func validated(_ input: JSON, now: Double = Date().timeIntervalSince1970 * 1000) throws -> [JSON] {
        guard input["version"] as? Int == 1, let entries = input["entries"] as? [JSON], entries.count <= 4096, let active = input["active"] as? [JSON], active.count <= 20000 else { throw FolioFailure("提醒计划过大或格式不正确") }
        var keys = Set<String>()
        for row in entries {
            for (key, max) in [("key", 1024), ("itemId", 300), ("revision", 2048), ("title", 160)] {
                let text = row.text(key); guard !text.isEmpty, text.count <= max, text.unicodeScalars.allSatisfy({ !CharacterSet.controlCharacters.contains($0) }) else { throw FolioFailure("提醒数据格式不正确") }
            }
            guard let at = row["at"] as? Double, at.isFinite, at >= now - 86400000, at <= now + 367 * 86400000, ["todo", "homework", "lesson", "event"].contains(row.text("kind")), keys.insert(row.text("key")).inserted else { throw FolioFailure("提醒时间或类型无效") }
        }
        return entries.filter { ($0["at"] as! Double) > now }.sorted { ($0["at"] as! Double) < ($1["at"] as! Double) }
    }
    func sync(_ input: JSON) async throws -> JSON {
        let all = try Self.validated(input), enabled = input.flag("enabled"), upcoming = enabled ? Array(all.prefix(60)) : []
        let old = await center.pendingNotificationRequests().filter { $0.identifier.hasPrefix("folio.reminder.") }
        let desired = Set(upcoming.map { "folio.reminder." + digest($0.text("key")) })
        center.removePendingNotificationRequests(withIdentifiers: old.map(\.identifier).filter { !desired.contains($0) })
        let current = (input["active"] as? [JSON] ?? []).reduce(into: [String: String]()) { $0[$1.text("id")] = $1.text("revision") }
        let delivered = await center.deliveredNotifications().filter { $0.request.identifier.hasPrefix("folio.reminder.") && (!enabled || current[$0.request.content.userInfo["itemId"] as? String ?? ""] != $0.request.content.userInfo["revision"] as? String) }
        center.removeDeliveredNotifications(withIdentifiers: delivered.map { $0.request.identifier })
        for row in upcoming {
            let content = UNMutableNotificationContent(); content.title = row.text("title"); content.body = row.text("kind") == "lesson" ? "课程安排提醒 · 点按查看" : "事项提醒 · 点按查看"; content.sound = .default
            content.userInfo = ["itemId": row.text("itemId"), "revision": row.text("revision")]
            let date = Date(timeIntervalSince1970: (row["at"] as! Double) / 1000)
            let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date), repeats: false)
            try await center.add(UNNotificationRequest(identifier: "folio.reminder." + digest(row.text("key")), content: content, trigger: trigger))
        }
        defaults.set(enabled, forKey: "reminders.enabled"); defaults.set(input["through"] as? Double ?? 0, forKey: "reminders.through"); defaults.set(max(0, all.count - upcoming.count), forKey: "reminders.deferred")
        return await status()
    }
    func test() async throws -> JSON {
        guard (await status()).flag("allowed") else { throw FolioFailure("请先允许系统通知") }
        let content = UNMutableNotificationContent(); content.title = "Folio · 提醒已就绪"; content.body = "这是一条测试通知"; content.sound = .default
        try await center.add(UNNotificationRequest(identifier: "folio.test", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 2, repeats: false)))
        return ["sent": true]
    }
}

import UIKit
import UserNotifications
import WebKit

@MainActor final class NativeServices {
    let vault: NativeVault
    private let protocolClasses: [AnyClass]?
    private let directory: URL?
    private let cookieStore: WKHTTPCookieStore?
    lazy var http = NativeHTTP(vault: vault, protocolClasses: protocolClasses, cookieStore: cookieStore)
    lazy var school = NativeSchool(http: http, vault: vault)
    private var records: NativeRecords?
    private let transfer = NativeTransfer(), exporter = NativeFileExport(), reminders = NativeReminders()
    private weak var controller: FolioViewController?
    private var accountEditor: NativeAccountEditor?, accountRequest: String?
    private var fileRequest: String?
    init(controller: FolioViewController, vault: NativeVault = NativeVault(), protocolClasses: [AnyClass]? = nil, directory: URL? = nil, cookieStore: WKHTTPCookieStore? = nil) { self.controller = controller; self.vault = vault; self.protocolClasses = protocolClasses; self.directory = directory; self.cookieStore = cookieStore }
    func cancel(_ id: String) { http.cancel(id); if accountRequest == id { accountEditor?.abort(); accountRequest = nil; accountEditor = nil }; if fileRequest == id { exporter.cancel() } }
    private func recordStore() throws -> NativeRecords { if let records = records { return records }; let value = try NativeRecords(vault: vault, directory: directory); records = value; return value }
    private func publicConfig(_ input: JSON) -> JSON { var value = input; value.removeValue(forKey: "apiKey"); value["hasKey"] = !input.text("apiKey").isEmpty; return value }
    private func configSave(_ input: JSON) throws -> JSON {
        let base = input.text("baseUrl").trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: base), url.scheme == "https", url.host != nil, url.user == nil, url.password == nil, url.query == nil, url.fragment == nil else { throw FolioFailure("请填写不含密钥或参数的HTTPS模型地址") }
        var config = input; config["baseUrl"] = base
        let key: String
        if let entered = input["apiKey"] as? String { key = entered } else { key = try vault.object("provider").text("apiKey") }
        guard key.isEmpty || matches(key, "^[\\x21-\\x7E]{1,2048}$") else { throw FolioFailure("API Key包含空格、换行或无效字符") }
        config["apiKey"] = key; try vault.save("provider", config); return publicConfig(config)
    }
    func perform(_ id: String, _ operation: String, _ input: JSON) async throws -> JSON {
        defer { http.finish(id) }
        switch operation {
        case "config.get": return publicConfig(try vault.object("provider"))
        case "config.save": return try configSave(input)
        case "provider": return try await http.provider(id, input)
        case "records.get": return try recordStore().get(input.text("name"))
        case "records.save": return try recordStore().save(input)
        case "sync.records.replace": return try recordStore().replace(input, account: school.account().text("accountId"))
        case "school.account.get": return try school.account()
        case "school.account.save":
            var result = try await school.save(input)
            if input.flag("login") {
                do { _ = try await school.authenticate(id, site: "academic"); result["authenticated"] = true }
                catch { result["authenticated"] = false; result["warning"] = error.localizedDescription }
            }; return result
        case "school.account.edit": return try await editAccount(id)
        case "school.account.forget": try await school.forget(); return ["forgotten": true]
        case "school.logout": await school.logout(); return ["cleared": true]
        case "school.authenticate": return try await school.authenticate(id, site: input.text("site", "academic"))
        case "school": return try await school.read(id, input)
        case "school.diagnostics": return ["lines": http.diagnostics]
        case "school.login": try await officialLogin(input.text("site", "academic")); return ["opened": true]
        case "app.sync.export.begin": return try transfer.begin(input.text("filename"))
        case "app.sync.export.chunk": return try transfer.append(input)
        case "app.sync.export.cancel": transfer.cancel(input.text("token")); return [:]
        case "app.sync.export.save":
            guard let controller = controller else { throw FolioFailure("页面已关闭") }
            return try await saveFile(id, transfer.finish(input.text("token")), from: controller)
        case "app.calendar.export":
            guard let controller = controller else { throw FolioFailure("页面已关闭") }
            let filename = input.text("filename"), text = input.text("content")
            guard matches(filename, "^folio-[0-9-]+\\.ics$"), text.utf8.count <= 2_000_000, text.hasPrefix("BEGIN:VCALENDAR\r\n"), text.hasSuffix("END:VCALENDAR\r\n") else { throw FolioFailure("日历文件无效或过大") }
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString); try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let file = folder.appendingPathComponent(filename); try Data(text.utf8).write(to: file, options: .completeFileProtection)
            return try await saveFile(id, file, from: controller)
        case "app.notification.status": return ["allowed": (await reminders.status()).flag("allowed")]
        case "app.notification.permission":
            let result = try await reminders.permission(); controller?.dispatch("folio-notification-permission"); return result
        case "app.reminders.status": return await reminders.status()
        case "app.reminders.sync": return try await reminders.sync(input)
        case "app.reminders.test": return try await reminders.test()
        case "app.notification.settings", "app.reminders.exact.settings":
            guard let url = URL(string: UIApplication.openNotificationSettingsURLString), await UIApplication.shared.open(url) else { throw FolioFailure("无法打开系统通知设置") }; return ["opened": true]
        case "app.notify":
            let foreground = UIApplication.shared.applicationState == .active
            if !foreground, (await reminders.status()).flag("allowed") {
                let content = UNMutableNotificationContent(); content.title = "Folio · 成绩有更新"; content.body = "打开应用查看最新成绩"; content.sound = .default
                try await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "folio.grades", content: content, trigger: nil))
            }; return ["foreground": foreground]
        case "app.background": throw FolioFailure("iOS不允许应用自行退到后台，请使用系统手势")
        case "app.usage.read", "app.usage.settings": throw FolioFailure("iOS测试版暂不支持读取其他应用的使用时长")
        default: throw FolioFailure("iOS暂不支持此原生操作（\(operation)）")
        }
    }
    private func saveFile(_ id: String, _ file: URL, from controller: UIViewController) async throws -> JSON {
        guard fileRequest == nil else { throw FolioFailure("已有文件正在保存") }
        fileRequest = id; defer { fileRequest = nil }
        do { return try await exporter.save(file, from: controller) }
        catch { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()); throw error }
    }
    private func editAccount(_ id: String) async throws -> JSON {
        guard let controller = controller, controller.presentedViewController == nil, accountEditor == nil else { throw FolioFailure("请先关闭当前系统窗口") }
        let account = try school.account()
        return await withCheckedContinuation { continuation in
            let editor = NativeAccountEditor(school: school, account: account); accountEditor = editor; accountRequest = id
            editor.completion = { [weak self] result in self?.accountEditor = nil; self?.accountRequest = nil; continuation.resume(returning: result) }
            let nav = UINavigationController(rootViewController: editor); nav.overrideUserInterfaceStyle = controller.overrideUserInterfaceStyle
            controller.present(nav, animated: true)
        }
    }
    private func officialLogin(_ site: String) async throws {
        guard let controller = controller, controller.presentedViewController == nil, ["academic", "homework", "practice"].contains(site) else { throw FolioFailure("请先关闭当前系统窗口或选择有效学校平台") }
        await http.importBrowserCookies()
        let target = site == "homework" ? "https://courses.zju.edu.cn/user/index" : site == "practice" ? "https://sztz.zju.edu.cn/dekt/" : "https://zjuam.zju.edu.cn/cas/login?service=https%3A%2F%2Fzdbk.zju.edu.cn%2Fjwglxt%2Fxtgl%2Flogin_ssologin.html"
        let browser = NativeSchoolBrowser(target: URL(string: target)!)
        browser.finished = { [weak self] in
            Task { @MainActor in guard let self = self else { return }; await self.school.browserCompleted(); self.controller?.dispatch("folio-school-login") }
        }
        controller.present(UINavigationController(rootViewController: browser), animated: true)
    }
}

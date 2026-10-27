import Foundation
import WebKit

#if DEBUG && targetEnvironment(simulator)
private final class FixtureURLProtocol: URLProtocol {
    static let lock = NSLock()
    static var seen: [URLRequest] = []
    static var responder: (URLRequest) -> (Int, [String: String], String) = { _ in (500, [:], "fixture missing") }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.lock.lock(); Self.seen.append(request); let (status, headers, text) = Self.responder(request); Self.lock.unlock()
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(text.utf8)); client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@MainActor enum NativeSmokeTests {
    static func run(controller: FolioViewController) async throws -> [JSON] {
        var checks: [JSON] = []
        func check(_ name: String, _ value: Bool) throws { checks.append(["name": name, "pass": value]); if !value { throw FolioFailure("Native: " + name) } }
        func reject(_ name: String, _ operation: () throws -> Void) throws {
            do { try operation() } catch { try check(name, true); return }; try check(name, false)
        }
        func asyncReject(_ name: String, _ operation: () async throws -> Void) async throws {
            do { try await operation() } catch { try check(name, true); return }; try check(name, false)
        }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("FolioNativeQA-" + UUID().uuidString)
        let vault = NativeVault(service: "app.folio.native-fixture." + UUID().uuidString)
        defer { for key in ["provider", "record-key", "school-account"] { try? vault.remove(key) }; try? FileManager.default.removeItem(at: folder) }
        let services = NativeServices(controller: controller, vault: vault, protocolClasses: [FixtureURLProtocol.self], directory: folder, cookieStore: WKWebsiteDataStore.nonPersistent().httpCookieStore)
        let saved = try await services.perform("config", "config.save", ["baseUrl": "https://fixture.invalid/v1", "apiKey": "fixture-secret", "model": "fixture"])
        try check("Keychain provider key never returned", saved["apiKey"] == nil && saved.flag("hasKey"))
        _ = try await services.perform("config2", "config.save", ["baseUrl": "https://fixture.invalid/v1", "model": "fixture2"])
        try check("Keychain key retained when omitted", try vault.object("provider").text("apiKey") == "fixture-secret")
        try await asyncReject("HTTP provider configuration rejected") { _ = try await services.perform("bad-config", "config.save", ["baseUrl": "http://fixture.invalid/v1"]) }
        try await asyncReject("Provider query credentials rejected") { _ = try await services.perform("bad-query", "config.save", ["baseUrl": "https://fixture.invalid/v1?key=x"]) }
        FixtureURLProtocol.responder = { _ in (200, ["Content-Type": "application/json"], "{\"echo\":\"fixture-secret\"}") }
        let provider = try await services.perform("provider", "provider", ["path": "models"])
        try check("Provider response redacts key", provider.text("body").contains("[已隐藏密钥]") && !provider.text("body").contains("fixture-secret"))
        try check("Provider authorization sent to configured host", FixtureURLProtocol.seen.last?.value(forHTTPHeaderField: "Authorization") == "Bearer fixture-secret" && FixtureURLProtocol.seen.last?.url?.host == "fixture.invalid")
        try await asyncReject("Arbitrary provider paths blocked") { _ = try await services.perform("bad-path", "provider", ["path": "../secret"]) }
        FixtureURLProtocol.responder = { _ in (302, ["Location": "https://elsewhere.invalid/"], "") }
        let beforeRedirect = FixtureURLProtocol.seen.count
        try await asyncReject("Provider redirect cannot forward API key") { _ = try await services.perform("redirect", "provider", ["path": "models"]) }
        try check("No redirect request issued", FixtureURLProtocol.seen.count == beforeRedirect + 1)
        FixtureURLProtocol.responder = { _ in (200, ["Set-Cookie": "iPlanetDirectoryPro=fixture-sso; Path=/cas; Secure; HttpOnly"], "") }
        _ = try await services.http.request("cas", "https://zjuam.zju.edu.cn/cas/login", method: "POST", body: "fixture", follow: false)
        try check("Issued CAS cookie promoted for business stations", services.http.hasCookie("https://zdbk.zju.edu.cn/jwglxt/", "iPlanetDirectoryPro"))
        try await asyncReject("School redirects cannot escape domain") { _ = try SchoolProtocol.trustedLocation(URL(string: "https://zju.edu.cn.attacker.invalid/")!) }
        try check("Diagnostics omit query and cookie values", !services.http.diagnostics.joined().contains("fixture-sso") && !NativeHTTP.safeEndpoint(URL(string: "https://zjuam.zju.edu.cn/cas/login?ticket=secret")!).contains("secret"))
        await services.school.logout()
        try check("Logout clears native school cookies", !services.http.hasCookie("https://zdbk.zju.edu.cn/", "iPlanetDirectoryPro"))
        let html = "<form><input type='hidden' name='execution' value='e&amp;1'><input type='hidden' name='lt' value='token'><input name='password'></form>"
        let form = try SchoolProtocol.form(html, username: "fixture", encrypted: "abc")
        try check("CAS preserves server hidden fields", form.contains("execution=e%261") && form.contains("lt=token") && form.contains("password=abc"))
        try reject("Missing execution fails safely") { _ = try SchoolProtocol.execution("<html></html>") }
        let n = "5f5adf1c8666553ad7239f2f7f42ebdffe150166f6a0e251c6906f59b7f0bdb150dcaeb4cdcadd74c7fe82fe3578f7e6c1dab1ec2cae84842c52a9277b40fdf0753ddbcc24cdfcf9ad4b8f9f1302be101e2e7ba9f869b982aefcff44bc610965673940a03b4fd89bf4cc0fb61363cbeade04ebe0f563a583ebd018bcf514a0ab"
        let expected = "2c52cbb107ec0e169832b37cac2e6de778dacd3b3488a6f72286f8f564a1e73abc8b402873a6497cfe42ce96de5883483c13d124b49bb720aed4cee8ef138dd9fb699a2175ad64a18c219c33ae1a91bd71cef0a3ae95da389acfd76c48a1cd8c419c5cbe5e956617bdc5b51842a9f459430e3da3767f006c62524f268dfc2266"
        try check("CAS RSA matches independent modular-exponent fixture", try SchoolProtocol.encrypt("Folio fixture", modulus: n, exponent: "10001") == expected)
        let exam = try NativeSchool.transport(["module": "exams", "page": 2])
        try check("Exam uses empty POST and query pagination", exam.1 == "POST" && exam.2 == "" && exam.0.contains("queryModel.currentPage=2") && !exam.4)
        try reject("Invalid course year rejected") { _ = try NativeSchool.transport(["module": "courses", "year": "2026-2028", "season": "1|秋"]) }
        let r = NativeResponse(status: 901, body: "", url: URL(string: "https://zdbk.zju.edu.cn/jwglxt/")!, location: "", data: Data(), mime: "", issuedSSO: nil)
        try check("HTTP 901 is expired auth", SchoolProtocol.expired(r))
        let records = try NativeRecords(vault: vault, directory: folder)
        try check("New record store has revision zero", try records.get("study")["revision"] as? Int == 0)
        let data: JSON = ["version": 1, "records": [["id": "fixture-private-record"]]]
        _ = try records.save(["name": "study", "expectedRevision": 0, "data": data])
        try check("Records encrypted at rest", !String(decoding: try Data(contentsOf: records.file), as: UTF8.self).contains("fixture-private-record"))
        try reject("Stale revision rejected without overwrite") { _ = try records.save(["name": "study", "expectedRevision": 0, "data": ["version": 1]]) }
        try check("Record survives repository restart", try NativeRecords(vault: vault, directory: folder).get("study")["revision"] as? Int == 1)
        let all = Dictionary(uniqueKeysWithValues: NativeRecords.names.map { ($0, data) }), revisions = Dictionary(uniqueKeysWithValues: NativeRecords.names.map { ($0, $0 == "study" ? 1 : 0) })
        let account = digest("fixture")
        var replacement: JSON = ["accountId": account, "transactionId": UUID().uuidString, "expected": revisions, "data": all]
        try reject("Cross-account import rejected") { _ = try records.replace(replacement, account: digest("other")) }
        var stale = revisions; stale["focus"] = 9; replacement["expected"] = stale
        try reject("All-record import rejects partial version conflict") { _ = try records.replace(replacement, account: account) }
        try check("Failed import does not advance any record", try records.get("study")["revision"] as? Int == 1 && records.get("learning")["revision"] as? Int == 0)
        replacement["expected"] = revisions; _ = try records.replace(replacement, account: account)
        try check("All-record import commits together", try records.get("study")["revision"] as? Int == 2 && records.get("learning")["revision"] as? Int == 1)
        var damaged = try Data(contentsOf: records.file); damaged[damaged.count - 1] ^= 1; try damaged.write(to: records.file)
        try reject("Damaged encrypted record never replaced with empty data") { _ = try records.get("study") }
        let transfer = NativeTransfer(), token = try transfer.begin("folio-sync-fixture.folio").text("token")
        _ = try transfer.append(["token": token, "offset": 0, "chunk": Data("fixture".utf8).base64EncodedString()])
        try reject("Out-of-order file chunks rejected") { _ = try transfer.append(["token": token, "offset": 0, "chunk": "YQ=="]) }
        let file = try transfer.finish(token)
        try check("Export preserves complete file bytes", try Data(contentsOf: file) == Data("fixture".utf8)); transfer.cancel(token); try? FileManager.default.removeItem(at: file.deletingLastPathComponent())
        let now = Date().timeIntervalSince1970 * 1000
        let plan: JSON = ["version": 1, "active": [], "entries": [["key": "x", "itemId": "item", "revision": "1", "title": "fixture", "kind": "lesson", "at": now + 10000]]]
        try check("Confirmed reminder plan validates", try NativeReminders.validated(plan, now: now).count == 1)
        var bad = plan; bad["entries"] = [["key": "x", "itemId": "item", "revision": "1", "title": "fixture", "kind": "lesson", "at": now + 400 * 86400000]]
        try reject("Invalid reminder horizon rejected") { _ = try NativeReminders.validated(bad, now: now) }
        return checks
    }
}
#endif

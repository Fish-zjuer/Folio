import Foundation
import WebKit

struct NativeResponse {
    let status: Int; let body: String; let url: URL; let location: String; let data: Data; let mime: String
    let issuedSSO: String?
    var json: JSON { ["status": status, "body": body, "url": url.scheme! + "://" + url.host! + url.path, "location": location, "ssoIssued": issuedSSO != nil] }
}

/// A bounded response, with redirects handled explicitly before any credential forwarding.
private final class HTTPExchange: NSObject, URLSessionDataDelegate {
    let protocolClasses: [AnyClass]?
    init(protocolClasses: [AnyClass]?) { self.protocolClasses = protocolClasses }
    private var continuation: CheckedContinuation<(Data, HTTPURLResponse), Error>?
    private var session: URLSession?; private var task: URLSessionDataTask?
    private var bytes = Data(); private var response: HTTPURLResponse?; private var failure: Error?
    func run(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let config = URLSessionConfiguration.ephemeral
            if let protocolClasses = protocolClasses { config.protocolClasses = protocolClasses }
            config.httpCookieStorage = nil; config.httpShouldSetCookies = false
            config.urlCache = nil; config.requestCachePolicy = .reloadIgnoringLocalCacheData
            config.timeoutIntervalForRequest = request.timeoutInterval; config.timeoutIntervalForResource = 115
            let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
            self.session = session; let task = session.dataTask(with: request); self.task = task; task.resume()
        }
    }
    func cancel() { task?.cancel() }
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard let response = response as? HTTPURLResponse, response.expectedContentLength <= 32 * 1024 * 1024 else {
            failure = FolioFailure("响应过大或格式无效"); completionHandler(.cancel); return
        }
        self.response = response; completionHandler(.allow)
    }
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        if bytes.count + data.count > 32 * 1024 * 1024 { failure = FolioFailure("响应过大，请缩小查询范围"); dataTask.cancel() }
        else { bytes.append(data) }
    }
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = failure ?? error { continuation?.resume(throwing: error) }
        else if let response = response { continuation?.resume(returning: (bytes, response)) }
        else { continuation?.resume(throwing: FolioFailure("服务未返回有效响应")) }
        continuation = nil; session.finishTasksAndInvalidate(); self.session = nil; self.task = nil
    }
}

@MainActor final class NativeHTTP {
    private let vault: NativeVault
    private let protocolClasses: [AnyClass]?
    private let cookieStore: WKHTTPCookieStore
    private var active: [String: HTTPExchange] = [:]
    private var cancelled = Set<String>()
    private(set) var generation = 0
    private(set) var diagnostics: [String] = []
    private var jar: [HTTPCookie] = []
    init(vault: NativeVault, protocolClasses: [AnyClass]? = nil, cookieStore: WKHTTPCookieStore? = nil) {
        self.vault = vault; self.protocolClasses = protocolClasses; self.cookieStore = cookieStore ?? WKWebsiteDataStore.default().httpCookieStore
        // WebKit persists its own cookie store; import from it when opening the official login.
    }
    nonisolated static func schoolHost(_ host: String?) -> Bool { host.map { $0 == "zju.edu.cn" || $0.hasSuffix(".zju.edu.cn") } ?? false }
    nonisolated static func trustedSchoolURL(_ url: URL) -> Bool { url.scheme == "https" && schoolHost(url.host) && url.user == nil && url.password == nil }
    nonisolated static func safeEndpoint(_ url: URL) -> String { (url.host ?? "") + url.path.replacingOccurrences(of: "[A-Za-z0-9_-]{24,}", with: "[omitted]", options: .regularExpression) }
    func trace(_ text: String) { diagnostics.append(text); if diagnostics.count > 60 { diagnostics.removeFirst(diagnostics.count - 60) } }
    func cancel(_ id: String) { cancelled.insert(id); active[id]?.cancel() }
    func finish(_ id: String) { cancelled.remove(id) }
    func reset() async {
        generation += 1; active.values.forEach { $0.cancel() }; jar.removeAll()
        let store = cookieStore
        for cookie in await store.allCookies() where Self.schoolHost(cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: "."))) { await store.deleteCookie(cookie) }
    }
    func importBrowserCookies() async {
        for cookie in await cookieStore.allCookies() {
            if Self.schoolHost(cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: "."))) { accept(cookie) }
        }
    }
    func browserCompleted() async { generation += 1; await importBrowserCookies() }
    private func accept(_ cookie: HTTPCookie) {
        jar.removeAll { $0.name == cookie.name && $0.domain == cookie.domain && $0.path == cookie.path }
        if cookie.expiresDate.map({ $0 > Date() }) ?? true, !cookie.value.isEmpty { jar.append(cookie) }
    }
    private func cookies(_ url: URL) -> [HTTPCookie] {
        jar.filter { c in
            let domain = c.domain.trimmingCharacters(in: CharacterSet(charactersIn: ".")), host = url.host ?? "", path = url.path.isEmpty ? "/" : url.path
            return (host == domain || c.domain.hasPrefix(".") && host.hasSuffix("." + domain)) && (!c.isSecure || url.scheme == "https") && (c.expiresDate.map { $0 > Date() } ?? true) && (path == c.path || path.hasPrefix(c.path) && (c.path.hasSuffix("/") || path.dropFirst(c.path.count).hasPrefix("/")))
        }.sorted { $0.path.count > $1.path.count }
    }
    func hasCookie(_ address: String, _ name: String) -> Bool { URL(string: address).map { cookies($0).contains { $0.name == name && !$0.value.isEmpty } } ?? false }
    func removeSSO() async {
        jar.removeAll { $0.name == "iPlanetDirectoryPro" }
        let store = cookieStore
        for cookie in await store.allCookies() where cookie.name == "iPlanetDirectoryPro" && Self.schoolHost(cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: "."))) { await store.deleteCookie(cookie) }
    }
    func request(_ id: String, _ address: String, method: String = "GET", body: String? = nil, headers: [String: String] = [:], school: Bool = true, follow: Bool = true) async throws -> NativeResponse {
        let epoch = generation; var current = address, method = method, body = body
        for _ in 0..<16 {
            try Task.checkCancellation()
            guard !cancelled.contains(id), !school || epoch == generation else { throw FolioFailure("请求已停止或学校账号已改变，请重试") }
            guard let url = URL(string: current), url.scheme == "https", url.user == nil, url.password == nil,
                  !school || Self.schoolHost(url.host) || url.host == "calendar.celechron.top" else { throw FolioFailure("连接地址必须使用可信 HTTPS 域名") }
            var request = URLRequest(url: url); request.httpMethod = method; request.httpBody = body.map { Data($0.utf8) }; request.timeoutInterval = school ? 25 : 90
            request.setValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Folio/0.1", forHTTPHeaderField: "User-Agent")
            for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
            if school { request.setValue(cookies(url).map { "\($0.name)=\($0.value)" }.joined(separator: "; "), forHTTPHeaderField: "Cookie") }
            let exchange = HTTPExchange(protocolClasses: protocolClasses); active[id] = exchange
            let (bytes, response): (Data, HTTPURLResponse)
            do { (bytes, response) = try await exchange.run(request) }
            catch { active.removeValue(forKey: id); throw error }
            active.removeValue(forKey: id)
            guard !cancelled.contains(id), !school || epoch == generation else { throw FolioFailure("学校账号已改变，请重新同步") }
            let fields = response.allHeaderFields.reduce(into: [String: String]()) { result, pair in result[String(describing: pair.key)] = String(describing: pair.value) }
            let received = HTTPCookie.cookies(withResponseHeaderFields: fields, for: url)
            let issued = url.host == "zjuam.zju.edu.cn" && url.path == "/cas/login" && method == "POST" ? received.last { $0.name == "iPlanetDirectoryPro" && !$0.value.isEmpty && ($0.expiresDate.map { $0 > Date() } ?? true) }?.value : nil
            if school && Self.schoolHost(url.host) {
                for cookie in received where Self.schoolHost(cookie.domain.trimmingCharacters(in: CharacterSet(charactersIn: "."))) {
                    guard epoch == generation else { throw FolioFailure("学校账号已改变") }
                    accept(cookie); await cookieStore.setCookie(cookie)
                }
                guard epoch == generation else { throw FolioFailure("学校账号已改变") }
                if let issued = issued, let promoted = HTTPCookie(properties: [.domain: ".zju.edu.cn", .path: "/", .name: "iPlanetDirectoryPro", .value: issued, .secure: "TRUE"]) { accept(promoted); await cookieStore.setCookie(promoted) }
            }
            let status = response.statusCode, location = response.value(forHTTPHeaderField: "Location") ?? ""
            if school { trace("\(method) \(Self.safeEndpoint(url)) → \(status) Cookie名[\(cookies(url).map(\.name).joined(separator: ","))]") }
            if follow && (300..<400).contains(status) {
                guard school, let next = URL(string: location, relativeTo: url)?.absoluteURL, !location.isEmpty else { throw FolioFailure("接口重定向：请使用最终HTTPS地址") }
                current = try SchoolProtocol.trustedLocation(next).absoluteString
                if [301, 302, 303].contains(status) { method = "GET"; body = nil }; continue
            }
            return NativeResponse(status: status, body: String(data: bytes, encoding: .utf8) ?? "", url: url, location: location, data: bytes, mime: response.mimeType ?? "", issuedSSO: issued)
        }
        throw FolioFailure("学校登录跳转过多，请使用官方网页登录")
    }
    func provider(_ id: String, _ input: JSON) async throws -> JSON {
        let config = try vault.object("provider"), base = config.text("baseUrl").trimmingCharacters(in: CharacterSet(charactersIn: "/")), key = config.text("apiKey"), path = input.text("path")
        guard let url = URL(string: base), url.scheme == "https", url.host != nil, url.user == nil, url.password == nil, url.query == nil, url.fragment == nil, !key.isEmpty else { throw FolioFailure("请先填写有效HTTPS模型地址和API Key") }
        guard ["models", "chat/completions"].contains(path), path == "models" || input["body"] is JSON else { throw FolioFailure("未知模型接口或请求格式") }
        let body = path == "models" ? nil : String(data: try jsonBytes(input["body"]!), encoding: .utf8)
        let result = try await request(id, base + "/" + path, method: path == "models" ? "GET" : "POST", body: body, headers: ["Authorization": "Bearer " + key, "Accept": "application/json", "Content-Type": "application/json"], school: false, follow: false)
        guard !(300..<400).contains(result.status) else { throw FolioFailure("模型接口发生重定向，请填写最终HTTPS地址") }
        return ["status": result.status, "body": result.body.replacingOccurrences(of: key, with: "[已隐藏密钥]")]
    }
}

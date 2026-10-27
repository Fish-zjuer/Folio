import Foundation

@MainActor final class NativeSchool {
    let http: NativeHTTP; let vault: NativeVault
    private var ssoTask: Task<Void, Error>?
    private var siteTasks: [String: Task<Void, Error>] = [:]
    private var ssoUntil = Date.distantPast, failureUntil = Date.distantPast
    private var failure = "", practiceVerified = false
    init(http: NativeHTTP, vault: NativeVault) { self.http = http; self.vault = vault }
    func account() throws -> JSON {
        let saved = try vault.object("school-account"), username = saved.text("username")
        return ["username": username, "hasPassword": !saved.text("password").isEmpty, "accountId": username.isEmpty ? "" : digest(username)]
    }
    func save(_ input: JSON) async throws -> JSON {
        let username = input.text("username").trimmingCharacters(in: .whitespacesAndNewlines), old = try vault.object("school-account")
        let password = input["password"] as? String ?? (old.text("username") == username ? old.text("password") : "")
        guard matches(username, "^[A-Za-z0-9._-]{3,64}$"), !password.isEmpty, password.count <= 512 else { throw FolioFailure("请填写有效学号和密码") }
        let changed = old.text("username") != username
        try vault.save("school-account", ["username": username, "password": password])
        ssoUntil = .distantPast; failureUntil = .distantPast; practiceVerified = false
        if changed { resetFlights(); await http.reset() }
        var result = try account(); result["changed"] = changed; return result
    }
    func forget() async throws { try vault.remove("school-account"); resetFlights(); await http.reset() }
    private func resetFlights() {
        ssoTask?.cancel(); ssoTask = nil; siteTasks.values.forEach { $0.cancel() }; siteTasks.removeAll()
        ssoUntil = .distantPast; failureUntil = .distantPast; practiceVerified = false
    }
    func logout() async { resetFlights(); await http.reset() }
    func browserCompleted() async { resetFlights(); await http.browserCompleted() }
    private let htmlHeaders = ["Accept": "text/html,application/json,*/*"]
    private func sso(_ id: String, force: Bool) async throws {
        if let task = ssoTask { return try await task.value }
        if !force && ssoUntil > Date() && http.hasCookie("https://zjuam.zju.edu.cn/cas/login", "iPlanetDirectoryPro") { return }
        if failureUntil > Date() { throw FolioFailure(failure) }
        let task = Task { @MainActor in
            let credentials = try vault.object("school-account"), username = credentials.text("username"), password = credentials.text("password")
            guard !username.isEmpty, !password.isEmpty else { throw FolioFailure("请先填写学校账号，或使用官方网页登录") }
            await http.removeSSO()
            let page = try await http.request(id, "https://zjuam.zju.edu.cn/cas/login", headers: htmlHeaders, follow: false)
            guard page.status == 200 else { throw FolioFailure("统一身份认证暂时无法访问，请使用官方网页登录") }
            _ = try SchoolProtocol.execution(page.body)
            let response = try await http.request(id, "https://zjuam.zju.edu.cn/cas/v2/getPubKey", headers: htmlHeaders, follow: false)
            guard response.status == 200 else { throw FolioFailure("未取得学校登录公钥") }
            let key = try jsonObject(Data(response.body.utf8)), encrypted = try SchoolProtocol.encrypt(password, modulus: key.text("modulus"), exponent: key.text("exponent"))
            var headers = htmlHeaders; headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"; headers["Origin"] = "https://zjuam.zju.edu.cn"; headers["Referer"] = "https://zjuam.zju.edu.cn/cas/login"
            let result = try await http.request(id, "https://zjuam.zju.edu.cn/cas/login", method: "POST", body: SchoolProtocol.form(page.body, username: username, encrypted: encrypted), headers: headers, follow: false)
            guard result.issuedSSO != nil, http.hasCookie("https://zjuam.zju.edu.cn/cas/login", "iPlanetDirectoryPro") else {
                failure = "统一身份认证未完成，请检查账号；如需验证码或二次认证，请使用官方网页登录"
                failureUntil = Date().addingTimeInterval(10); throw FolioFailure(failure)
            }
            ssoUntil = Date().addingTimeInterval(120); failureUntil = .distantPast
        }
        ssoTask = task; defer { ssoTask = nil }; try await task.value
    }
    private func business(_ id: String, site: String) async throws {
        if site == "homework" {
            var current = URL(string: "https://courses.zju.edu.cn/user/index")!
            for _ in 0..<16 {
                let result = try await http.request(id, current.absoluteString, headers: htmlHeaders, follow: false)
                if (300..<400).contains(result.status), let next = URL(string: result.location, relativeTo: current), !result.location.isEmpty { current = try SchoolProtocol.trustedLocation(next.absoluteURL); continue }
                if let next = try SchoolProtocol.metaRefresh(result.body, current) { current = next; continue }
                if (200..<300).contains(result.status), current.host == "courses.zju.edu.cn", http.hasCookie("https://courses.zju.edu.cn/api/todos", "session") { return }
                throw FolioFailure("学在浙大未完成登录，请使用官方网页登录")
            }
            throw FolioFailure("学在浙大登录跳转过多")
        }
        let service = site == "practice" ? "https://sztz.zju.edu.cn/dekt/" : "https://zdbk.zju.edu.cn/jwglxt/xtgl/login_ssologin.html"
        let cas = "https://zjuam.zju.edu.cn/cas/login?" + SchoolProtocol.encode(["service": service])
        let ticket = try await http.request(id, cas, headers: htmlHeaders, follow: false)
        guard (300..<400).contains(ticket.status), !ticket.location.isEmpty, let next = URL(string: ticket.location, relativeTo: URL(string: cas)!) else { throw FolioFailure("学校认证会话已失效") }
        let callback = try SchoolProtocol.trustedLocation(next.absoluteURL), expected = URL(string: service)!
        guard callback.host == expected.host, callback.path == expected.path, URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.contains(where: { $0.name == "ticket" && !($0.value ?? "").isEmpty }) == true else { throw FolioFailure("学校认证回调不正确") }
        let result = try await http.request(id, callback.absoluteString, headers: htmlHeaders, follow: site == "practice")
        guard (200..<400).contains(result.status), !SchoolProtocol.authBody(result.body) else { throw FolioFailure("学校平台会话未建立") }
        if site == "academic" {
            guard http.hasCookie(service, "JSESSIONID"), http.hasCookie(service, "route") else { throw FolioFailure("教务平台未建立完整会话，请使用官方网页登录") }
        } else { try await verifyPractice(id) }
    }
    private func verifyPractice(_ id: String) async throws {
        let response = try await http.request(id, "https://sztz.zju.edu.cn/dekt/ctx", method: "POST", body: "", headers: ["Accept": "application/json, text/plain, */*", "Content-Type": "application/x-www-form-urlencoded", "Origin": "https://sztz.zju.edu.cn", "Referer": "https://sztz.zju.edu.cn/dekt/"], follow: false)
        let payload = try jsonObject(Data(response.body.utf8))
        guard response.status == 200, payload.flag("success"), payload["code"] as? Int == 0, let decoded = Data(base64Encoded: payload.text("data")) else { throw FolioFailure("素质拓展未取得正式会话，请使用官方网页登录") }
        let context = try jsonObject(decoded), user = String(describing: context["userId"] ?? "").trimmingCharacters(in: .whitespacesAndNewlines), anonymous = String(describing: context["anonymous"] ?? "true").lowercased()
        guard ["false", "0"].contains(anonymous), !user.isEmpty, user != "ANONYMOUS", !String(describing: context["roles"] ?? "").contains("ANONYMOUS_USER_ROLE") else { throw FolioFailure("素质拓展返回匿名身份，请使用官方网页登录") }
        practiceVerified = true
    }
    func authenticate(_ id: String, site: String) async throws -> JSON {
        guard ["academic", "homework", "practice"].contains(site) else { throw FolioFailure("未知学校平台") }
        if let task = siteTasks[site] { try await task.value; return ["authenticated": true, "site": site] }
        let task = Task { @MainActor in
            try await sso(id, force: false)
            do { try await business(id, site: site) }
            catch { try await sso(id, force: true); try await business(id, site: site) }
        }
        siteTasks[site] = task; defer { siteTasks.removeValue(forKey: site) }; try await task.value
        return ["authenticated": true, "site": site]
    }
    static func transport(_ input: JSON) throws -> (String, String, String?, [String: String], Bool) {
        let module = input.text("module"), root = "https://zdbk.zju.edu.cn/jwglxt/"
        var url: String, method = "POST", body: String? = ""
        var headers = ["Accept": "application/json, text/javascript, */*; q=0.01", "X-Requested-With": "XMLHttpRequest", "Referer": root + "xtgl/index_initMenu.html", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"]
        switch module {
        case "grades": url = root + "cxdy/xscjcx_cxXscjIndex.html?doType=query&queryModel.showCount=5000"
        case "major": url = root + "zycjtj/xszgkc_cxXsZgkcIndex.html?doType=query&queryModel.showCount=5000"
        case "exams":
            let page = input["page"] as? Int ?? 1; guard (1...20).contains(page) else { throw FolioFailure("考试页码超出范围") }
            url = root + "xskscx/kscx_cxXsgrksIndex.html?doType=query&queryModel.showCount=5000" + (page > 1 ? "&queryModel.currentPage=\(page)" : "")
        case "captcha": url = root + "kaptcha?time=\(Int(Date().timeIntervalSince1970 * 1000))"; method = "GET"; body = nil
        case "courses":
            let year = input.text("year"), season = input.text("season"), years = year.split(separator: "-").compactMap { Int($0) }
            guard matches(year, "^20[0-9]{2}-20[0-9]{2}$"), years.count == 2, years[1] == years[0] + 1, ["1|秋", "1|冬", "2|春", "2|夏"].contains(season) else { throw FolioFailure("请使用完整学年和有效学期") }
            url = root + "kbcx/xskbcx_cxXsKb.html"; body = SchoolProtocol.encode(["xnm": year, "xqm": season, "captcha_value": input.text("captcha")])
        case "homework": url = "https://courses.zju.edu.cn/api/todos"; method = "GET"; body = nil; headers = ["Accept": "application/json, text/plain, */*", "Referer": "https://courses.zju.edu.cn/user/index"]
        case "practice", "practiceSummary": url = "https://sztz.zju.edu.cn/dekt/student/home/" + (module == "practice" ? "getSqjl" : "getMyInfo"); method = "GET"; body = nil; headers = ["Accept": "application/json, text/plain, */*", "Cache-Control": "no-cache", "Pragma": "no-cache"]
        case "calendar":
            let term = input.text("term"); guard matches(term, "^20[0-9]{2}-20[0-9]{2}-[12]$") else { throw FolioFailure("学期不正确") }
            url = "https://calendar.celechron.top/" + term + ".json"; method = "GET"; body = nil; headers = [:]
        default: throw FolioFailure("未知教务模块")
        }
        return (url, method, body, headers, module != "exams")
    }
    private func fetch(_ id: String, _ input: JSON) async throws -> NativeResponse {
        let (url, method, body, headers, follow) = try Self.transport(input)
        return try await http.request(id, url, method: method, body: body, headers: headers, follow: follow)
    }
    func read(_ id: String, _ input: JSON) async throws -> JSON {
        _ = try Self.transport(input)
        let module = input.text("module"), site = module == "homework" ? "homework" : module.hasPrefix("practice") ? "practice" : "academic", epoch = http.generation
        if module != "calendar" {
            await http.importBrowserCookies()
            let probe = site == "homework" ? "https://courses.zju.edu.cn/api/todos" : site == "practice" ? "https://sztz.zju.edu.cn/dekt/" : "https://zdbk.zju.edu.cn/jwglxt/"
            let cookie = site == "homework" ? "session" : site == "practice" ? "SESSION" : "JSESSIONID"
            if !http.hasCookie(probe, cookie) || site == "academic" && !http.hasCookie(probe, "route") { _ = try await authenticate(id, site: site) }
            else if site == "practice" && !practiceVerified { try await verifyPractice(id) }
        }
        var result = try await fetch(id, input)
        if module != "calendar" && SchoolProtocol.expired(result) {
            _ = try await authenticate(id, site: site); result = try await fetch(id, input)
            guard !SchoolProtocol.expired(result) else { throw FolioFailure("学校接口重建会话后仍要求认证（HTTP \(result.status)）；原缓存保留，请使用官方网页登录") }
        }
        guard epoch == http.generation else { throw FolioFailure("学校账号已改变，请重新同步") }
        if module == "captcha", result.mime.hasPrefix("image/"), result.status == 200 { return ["status": 200, "image": "data:\(result.mime);base64," + result.data.base64EncodedString()] }
        return result.json
    }
}

import Foundation
import Security

/// CAS form and raw-RSA protocol ported from Folio Android / Celechron (GPL-3.0).
enum SchoolProtocol {
    static func captures(_ pattern: String, _ text: String) -> [[String]] {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators]) else { return [] }
        let value = text as NSString
        return regex.matches(in: text, range: NSRange(location: 0, length: value.length)).map { match in (0..<match.numberOfRanges).map { match.range(at: $0).location == NSNotFound ? "" : value.substring(with: match.range(at: $0)) } }
    }
    static func decode(_ text: String) -> String { text.replacingOccurrences(of: "&quot;", with: "\"").replacingOccurrences(of: "&#39;", with: "'").replacingOccurrences(of: "&lt;", with: "<").replacingOccurrences(of: "&gt;", with: ">").replacingOccurrences(of: "&amp;", with: "&") }
    static func attribute(_ tag: String, _ name: String) -> String {
        guard let match = captures("(?:^|\\s)" + NSRegularExpression.escapedPattern(for: name) + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", tag).first else { return "" }
        return decode(match.dropFirst().first { !$0.isEmpty } ?? "")
    }
    static func execution(_ html: String) throws -> String {
        for tag in captures("<input\\b[^>]*>", html).map({ $0[0] }) where attribute(tag, "name") == "execution" {
            let value = attribute(tag, "value"); if !value.isEmpty { return value }
        }
        throw FolioFailure("学校登录页发生变化，未取得认证表单；请使用官方网页登录")
    }
    static func form(_ html: String, username: String, encrypted: String) throws -> String {
        guard let form = captures("<form\\b[^>]*>(.*?)</form\\s*>", html).first(where: { (try? execution($0[1])) != nil })?.last else { throw FolioFailure("学校登录页缺少认证表单") }
        var fields = [String: String]()
        for tag in captures("<input\\b[^>]*>", form).map({ $0[0] }) where attribute(tag, "type").lowercased() == "hidden" {
            let name = attribute(tag, "name"); if matches(name, "^[A-Za-z_][A-Za-z0-9_.-]{0,63}$"), fields.count < 32 { fields[name] = attribute(tag, "value") }
        }
        fields["execution"] = try execution(form); fields["_eventId"] = "submit"; fields["username"] = username; fields["password"] = encrypted; fields["rememberMe"] = "true"; fields["authcode"] = ""
        return encode(fields)
    }
    static func encode(_ fields: [String: String]) -> String {
        let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        return fields.sorted { $0.key < $1.key }.map { ($0.key.addingPercentEncoding(withAllowedCharacters: allowed) ?? "") + "=" + ($0.value.addingPercentEncoding(withAllowedCharacters: allowed) ?? "") }.joined(separator: "&")
    }
    static func trustedLocation(_ input: URL) throws -> URL {
        var c = URLComponents(url: input, resolvingAgainstBaseURL: true)!
        if c.scheme == "http" && NativeHTTP.schoolHost(c.host) { c.scheme = "https" }
        guard let url = c.url, NativeHTTP.trustedSchoolURL(url) else { throw FolioFailure("学校登录跳转超出可信域名") }; return url
    }
    static func authBody(_ body: String) -> Bool {
        let s = body.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if s.hasPrefix("{") || s.hasPrefix("[") { return false }
        return ["请先登录", "未登录", "登录已失效", "unauthorized"].contains(s) || s.contains("zjuam.zju.edu.cn/cas/login") && (s.contains("location") || s.contains("http-equiv")) || matches(s, "<input\\b[^>]*(?:type|name)\\s*=\\s*['\"]?password") && (s.contains("execution") || s.contains("username") || s.contains("cas/login"))
    }
    static func authEndpoint(_ url: URL) -> Bool { url.host == "identity.zju.edu.cn" || url.host == "zjuam.zju.edu.cn" && url.path.hasPrefix("/cas/login") }
    static func expired(_ result: NativeResponse) -> Bool {
        if [401, 403, 901].contains(result.status) || authEndpoint(result.url) || authBody(result.body) { return true }
        if (300..<400).contains(result.status), let target = URL(string: result.location, relativeTo: result.url), authEndpoint(target) || target.path.contains("login_") { return true }
        guard let json = try? jsonObject(Data(result.body.utf8)) else { return false }
        let code = json["code"] as? Int ?? json["status"] as? Int ?? 0
        let message = json.text("message", json.text("msg"))
        return [401, 403, 901].contains(code) || json["kickout"] as? Int == 1 || json["isLogin"] as? Bool == false || (message.contains("登录") || message.contains("认证") || message.contains("token")) && (json["success"] as? Bool == false || code != 0 && code != 200)
    }
    static func metaRefresh(_ html: String, _ url: URL) throws -> URL? {
        for tag in captures("<meta\\b[^>]*>", html).map({ $0[0] }) where attribute(tag, "http-equiv").lowercased() == "refresh" {
            if let raw = captures("url\\s*=\\s*['\"]?([^'\";\\s]+)", attribute(tag, "content")).first?[1], let next = URL(string: raw, relativeTo: url) { return try trustedLocation(next.absoluteURL) }
        }; return nil
    }
    static func encrypt(_ password: String, modulus: String, exponent: String) throws -> String {
        guard !password.isEmpty, password.count <= 512, matches(modulus, "^[0-9a-fA-F]{64,2048}$"), matches(exponent, "^[0-9a-fA-F]{1,16}$") else { throw FolioFailure("认证密码或公钥格式不正确") }
        func hex(_ raw: String) -> Data {
            let value = raw.count % 2 == 1 ? "0" + raw : raw
            return Data(stride(from: 0, to: value.count, by: 2).map { index in let start = value.index(value.startIndex, offsetBy: index); return UInt8(value[start..<value.index(start, offsetBy: 2)], radix: 16)! })
        }
        func der(_ tag: UInt8, _ value: Data) -> Data {
            var count = value.count, length = Data()
            if count < 128 { length.append(UInt8(count)) }
            else { while count > 0 { length.insert(UInt8(count & 255), at: 0); count >>= 8 }; length.insert(0x80 | UInt8(length.count), at: 0) }
            return Data([tag]) + length + value
        }
        func integer(_ raw: Data) -> Data { var data = Data(raw.drop(while: { $0 == 0 })); if data.first.map({ $0 >= 128 }) ?? false { data.insert(0, at: 0) }; return der(0x02, data) }
        let n = hex(modulus), e = hex(exponent)
        let encoded = der(0x30, integer(n) + integer(e)); var error: Unmanaged<CFError>?
        guard let key = SecKeyCreateWithData(encoded as CFData, [kSecAttrKeyType: kSecAttrKeyTypeRSA, kSecAttrKeyClass: kSecAttrKeyClassPublic] as CFDictionary, &error) else { throw FolioFailure("学校公钥无效") }
        let size = SecKeyGetBlockSize(key), plain = Data(password.utf8)
        guard plain.count < size else { throw FolioFailure("认证密码过长") }
        let padded = Data(repeating: 0, count: size - plain.count) + plain
        guard let result = SecKeyCreateEncryptedData(key, .rsaEncryptionRaw, padded as CFData, &error) as Data? else { throw FolioFailure("学校认证密码未能加密") }
        // Match Java BigInteger.modPow: fixed-width hexadecimal, with at least 128 digits.
        let text = result.map { String(format: "%02x", $0) }.joined().drop(while: { $0 == "0" })
        return String(repeating: "0", count: max(0, 128 - text.count)) + text
    }
}

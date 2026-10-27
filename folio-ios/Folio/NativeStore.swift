import Foundation
import Security
import CryptoKit

typealias JSON = [String: Any]
struct FolioFailure: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}
extension Dictionary where Key == String, Value == Any {
    func text(_ key: String, _ fallback: String = "") -> String { self[key] as? String ?? fallback }
    func flag(_ key: String) -> Bool { self[key] as? Bool ?? false }
}
func jsonBytes(_ value: Any) throws -> Data { try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) }
func jsonObject(_ bytes: Data) throws -> JSON {
    guard let object = try JSONSerialization.jsonObject(with: bytes) as? JSON else { throw FolioFailure("数据格式不正确") }
    return object
}
func matches(_ value: String, _ pattern: String) -> Bool { value.range(of: pattern, options: .regularExpression) != nil }
func digest(_ value: String) -> String { SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined() }

/// Credentials and the record-encryption key stay in this app's Keychain access group.
final class NativeVault {
    let service: String
    init(service: String = Bundle.main.bundleIdentifier ?? "app.folio.ios") { self.service = service }
    private func query(_ name: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: name]
    }
    func read(_ name: String) throws -> Data? {
        var q = query(name); q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?; let status = SecItemCopyMatching(q as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw FolioFailure("安全存储暂时无法读取，请解锁设备后重试") }
        return data
    }
    func write(_ name: String, _ data: Data) throws {
        let q = query(name), update = [kSecValueData as String: data]
        var status = SecItemUpdate(q as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var insert = q; insert[kSecValueData as String] = data
            insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            status = SecItemAdd(insert as CFDictionary, nil)
        }
        guard status == errSecSuccess else { throw FolioFailure("安全配置未能保存，原配置保留") }
    }
    func remove(_ name: String) throws {
        let status = SecItemDelete(query(name) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw FolioFailure("安全配置未能清除") }
    }
    func object(_ name: String) throws -> JSON { try read(name).map(jsonObject) ?? [:] }
    func save(_ name: String, _ value: JSON) throws { try write(name, jsonBytes(value)) }
    func recordKey() throws -> SymmetricKey {
        if let data = try read("record-key") {
            guard data.count == 32 else { throw FolioFailure("记录密钥损坏，请保留应用数据") }
            return SymmetricKey(data: data)
        }
        let key = SymmetricKey(size: .bits256)
        try write("record-key", key.withUnsafeBytes { Data($0) }); return key
    }
}

/// A single encrypted atomic bundle makes all four record replacements transactional.
@MainActor final class NativeRecords {
    static let names = Set(["study", "pomodoro", "focus", "learning"])
    let vault: NativeVault
    let file: URL
    init(vault: NativeVault, directory: URL? = nil) throws {
        self.vault = vault
        var folder = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Folio")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        var values = URLResourceValues(); values.isExcludedFromBackup = true; try folder.setResourceValues(values)
        file = folder.appendingPathComponent("records.aesgcm")
    }
    private func bundle() throws -> JSON {
        guard FileManager.default.fileExists(atPath: file.path) else { return [:] }
        let sealed = try AES.GCM.SealedBox(combined: Data(contentsOf: file))
        return try jsonObject(AES.GCM.open(sealed, using: vault.recordKey()))
    }
    private func publish(_ value: JSON) throws {
        let plain = try jsonBytes(value)
        guard plain.count <= 68 * 1024 * 1024 else { throw FolioFailure("记录总量超过上限") }
        guard let sealed = try AES.GCM.seal(plain, using: vault.recordKey()).combined else { throw FolioFailure("记录未能加密") }
        try sealed.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    private func snapshot(_ name: String, in bundle: JSON) throws -> JSON {
        guard Self.names.contains(name) else { throw FolioFailure("未知记录集合") }
        if let raw = bundle[name] {
            guard let value = raw as? JSON, let revision = value["revision"] as? Int, revision > 0, value["data"] is JSON else { throw FolioFailure("本机记录损坏，请保留应用数据") }
            return value
        }
        return ["revision": 0, "data": JSON()]
    }
    func get(_ name: String) throws -> JSON { try snapshot(name, in: bundle()) }
    private func staged(_ name: String, expected: Int, data: JSON, in bundle: JSON) throws -> JSON {
        let old = try snapshot(name, in: bundle), revision = old["revision"] as! Int
        guard expected >= 0, revision == expected, revision < Int.max else { throw FolioFailure("记录版本冲突：请读取最新记录后重新确认") }
        guard (data["version"] as? Int) == 1, try jsonBytes(data).count <= 16 * 1024 * 1024 else { throw FolioFailure("记录版本不支持或内容过大") }
        return ["revision": revision + 1, "data": data]
    }
    func save(_ input: JSON) throws -> JSON {
        guard let expected = input["expectedRevision"] as? Int, let data = input["data"] as? JSON else { throw FolioFailure("记录格式不正确") }
        let name = input.text("name"); var all = try bundle()
        let result = try staged(name, expected: expected, data: data, in: all)
        all[name] = result; try publish(all); return result
    }
    func replace(_ input: JSON, account: String) throws -> JSON {
        guard !account.isEmpty, input.text("accountId") == account,
              matches(input.text("transactionId"), "^[A-Za-z0-9-]{16,80}$"),
              let data = input["data"] as? JSON, let expected = input["expected"] as? JSON,
              Set(data.keys) == Self.names, Set(expected.keys) == Self.names else { throw FolioFailure("同步集合或当前学校账号不一致") }
        let before = try bundle(); var after = before
        for name in Self.names {
            guard let value = data[name] as? JSON, let revision = expected[name] as? Int else { throw FolioFailure("同步记录不完整") }
            after[name] = try staged(name, expected: revision, data: value, in: before)
        }
        try publish(after); return ["saved": true]
    }
}

@MainActor final class NativeTransfer {
    private struct Transfer { let file: URL; let name: String; var count: Int }
    private var transfers: [String: Transfer] = [:]
    func begin(_ name: String) throws -> JSON {
        guard matches(name, "^folio-[A-Za-z0-9._-]{1,100}\\.(folio|zip)$"), transfers.isEmpty else { throw FolioFailure("文件名无效或已有文件正在导出") }
        let token = UUID().uuidString, file = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try Data().write(to: file, options: .completeFileProtection)
        transfers[token] = Transfer(file: file, name: name, count: 0); return ["token": token]
    }
    func append(_ input: JSON) throws -> JSON {
        let token = input.text("token")
        guard var transfer = transfers[token], let offset = input["offset"] as? Int, offset == transfer.count,
              let data = Data(base64Encoded: input.text("chunk")), data.count <= 256 * 1024, transfer.count + data.count <= 48 * 1024 * 1024 else { throw FolioFailure("导出分片无效或文件过大") }
        let handle = try FileHandle(forWritingTo: transfer.file); defer { try? handle.close() }
        try handle.seekToEnd(); try handle.write(contentsOf: data)
        transfer.count += data.count; transfers[token] = transfer; return ["offset": transfer.count]
    }
    func finish(_ token: String) throws -> URL {
        guard let transfer = transfers[token], transfer.count > 0 else { throw FolioFailure("导出文件不完整") }
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let target = folder.appendingPathComponent(transfer.name); try FileManager.default.copyItem(at: transfer.file, to: target)
        return target
    }
    func cancel(_ token: String) { if let value = transfers.removeValue(forKey: token) { try? FileManager.default.removeItem(at: value.file) } }
}

import Foundation
import Network

/// Loopback keeps the web origin stable across launches and enables secure-context
/// APIs (crypto/IndexedDB) without relying on private WKWebView file-access flags.
final class LocalAssetServer {
    static let port: UInt16 = 47631
    static let origin = "http://127.0.0.1:\(port)"
    private let root: URL
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "folio.assets")
    private var connections: [ObjectIdentifier: NWConnection] = [:]

    init(root: URL) { self.root = root }

    func start(completion: @escaping (Result<Void, Error>) -> Void) {
        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: Self.port)!)
            parameters.allowLocalEndpointReuse = true
            let listener = try NWListener(using: parameters)
            self.listener = listener
            var answered = false
            listener.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    if !answered { answered = true; DispatchQueue.main.async { completion(.success(())) } }
                case .failed(let error):
                    if !answered { answered = true; DispatchQueue.main.async { completion(.failure(error)) } }
                default: break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                guard let self = self else { connection.cancel(); return }
                self.connections[ObjectIdentifier(connection)] = connection
                connection.start(queue: self.queue)
                self.receive(connection, bytes: Data())
            }
            listener.start(queue: queue)
        } catch { completion(.failure(error)) }
    }

    private func receive(_ connection: NWConnection, bytes: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 16_384) { [weak self] data, _, complete, error in
            guard let self = self else { connection.cancel(); return }
            var bytes = bytes
            if let data = data { bytes.append(data) }
            if bytes.count > 16_384 { self.respond(connection, status: 431); return }
            if let text = String(data: bytes, encoding: .utf8), text.contains("\r\n\r\n") {
                let words = text.components(separatedBy: "\r\n")[0].split(separator: " ")
                guard words.count == 3, words[0] == "GET" || words[0] == "HEAD",
                      let parts = URLComponents(string: String(words[1])), parts.host == nil,
                      let path = parts.percentEncodedPath.removingPercentEncoding,
                      path.hasPrefix("/"), !path.contains("\\"), !path.split(separator: "/").contains("..")
                else { self.respond(connection, status: 400); return }
                let file = self.root.appendingPathComponent(path == "/" ? "index.html" : String(path.dropFirst())).standardizedFileURL
                guard file.path.hasPrefix(self.root.standardizedFileURL.path + "/"),
                      let contents = try? Data(contentsOf: file) else { self.respond(connection, status: 404); return }
                let mime = ["html":"text/html; charset=utf-8", "js":"application/javascript; charset=utf-8", "css":"text/css; charset=utf-8", "svg":"image/svg+xml", "woff2":"font/woff2", "txt":"text/plain; charset=utf-8"][file.pathExtension] ?? "application/octet-stream"
                self.respond(connection, status: 200, body: contents, mime: mime, head: words[0] == "HEAD")
            } else if complete || error != nil { self.close(connection) }
            else { self.receive(connection, bytes: bytes) }
        }
    }

    private func respond(_ connection: NWConnection, status: Int, body: Data = Data(), mime: String = "text/plain", head: Bool = false) {
        // Existing public weather/news code uses ordinary HTTPS fetch outside
        // Android's appassets origin. Permit only those documented public APIs;
        // school sessions and model traffic still require the native bridge.
        let policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.open-meteo.com/v1/forecast https://geocoding-api.open-meteo.com/v1/search https://hacker-news.firebaseio.com/v0/; frame-src \(Self.origin)/relationship-view.html; media-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
        let header = "HTTP/1.1 \(status) \(status == 200 ? "OK" : "Error")\r\nContent-Type: \(mime)\r\nContent-Length: \(body.count)\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: \(policy)\r\nConnection: close\r\n\r\n"
        var response = Data(header.utf8)
        if !head { response.append(body) }
        connection.send(content: response, completion: .contentProcessed { [weak self] _ in self?.close(connection) })
    }

    private func close(_ connection: NWConnection) { connections.removeValue(forKey: ObjectIdentifier(connection)); connection.cancel() }
    deinit { listener?.cancel(); connections.values.forEach { $0.cancel() } }
}

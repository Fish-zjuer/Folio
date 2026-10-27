// Rasterize the existing SVG's flat polygons without changing its design.
import AppKit
import ImageIO
import UniformTypeIdentifiers

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let svg = try String(contentsOf: root.appendingPathComponent("../folio-prototype/assets/folio-icon.svg"), encoding: .utf8)
let regex = try NSRegularExpression(pattern: "<path fill=\"(#[0-9A-Fa-f]{6})\" d=\"([^\"]+)\"/>")
let source = svg as NSString
let paths = regex.matches(in: svg, range: NSRange(location: 0, length: source.length))
guard svg.contains("viewBox=\"18 18 72 72\""), paths.count == 3 else { fatalError("Icon source changed; review the existing SVG before exporting") }
let size = 1024
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
func color(_ hex: String) -> CGColor {
    let value = UInt32(hex.dropFirst(), radix: 16)!
    return CGColor(red: CGFloat(value >> 16 & 255) / 255, green: CGFloat(value >> 8 & 255) / 255, blue: CGFloat(value & 255) / 255, alpha: 1)
}
context.setFillColor(color(source.substring(with: paths[0].range(at: 1)))); context.fill(CGRect(x: 0, y: 0, width: size, height: size))
context.translateBy(x: 0, y: CGFloat(size)); context.scaleBy(x: CGFloat(size) / 72, y: -CGFloat(size) / 72); context.translateBy(x: -18, y: -18)
for match in paths.dropFirst() {
    let text = source.substring(with: match.range(at: 2)) as NSString
    let tokenizer = try NSRegularExpression(pattern: "[MLHVZ]|-?[0-9]+(?:\\.[0-9]+)?")
    let tokens = tokenizer.matches(in: text as String, range: NSRange(location: 0, length: text.length)).map { text.substring(with: $0.range) }
    var i = 0, x = 0.0, y = 0.0
    func number() -> Double { guard i < tokens.count, let n = Double(tokens[i]) else { fatalError("Unsupported SVG coordinate") }; i += 1; return n }
    context.beginPath()
    while i < tokens.count {
        let command = tokens[i]; i += 1
        switch command {
        case "M": x = number(); y = number(); context.move(to: CGPoint(x: x, y: y))
        case "L": x = number(); y = number(); context.addLine(to: CGPoint(x: x, y: y))
        case "V": y = number(); context.addLine(to: CGPoint(x: x, y: y))
        case "H": x = number(); context.addLine(to: CGPoint(x: x, y: y))
        case "Z": context.closePath()
        default: fatalError("Unsupported icon command")
        }
    }
    context.setFillColor(color(source.substring(with: match.range(at: 1)))); context.fillPath()
}
let catalog = root.appendingPathComponent("Generated/AppIcons.xcassets"), folder = catalog.appendingPathComponent("AppIcon.appiconset")
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
let destination = CGImageDestinationCreateWithURL(folder.appendingPathComponent("icon.png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, context.makeImage()!, nil); guard CGImageDestinationFinalize(destination) else { fatalError("Icon export failed") }
try Data("{\"info\":{\"author\":\"xcode\",\"version\":1}}".utf8).write(to: catalog.appendingPathComponent("Contents.json"))
let contents = "{\"images\":[{\"filename\":\"icon.png\",\"idiom\":\"universal\",\"platform\":\"ios\",\"size\":\"1024x1024\"}],\"info\":{\"author\":\"xcode\",\"version\":1}}"
try Data(contents.utf8).write(to: folder.appendingPathComponent("Contents.json"))
print("Original Folio icon exported at 1024px")

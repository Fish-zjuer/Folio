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
    let points = source.substring(with: match.range(at: 2)).split(whereSeparator: { !$0.isNumber && $0 != "." && $0 != "-" }).compactMap { Double($0) }
    guard points.count == 8 else { fatalError("Unsupported icon path") }
    context.beginPath(); context.move(to: CGPoint(x: points[0], y: points[1]))
    for i in stride(from: 2, to: points.count, by: 2) { context.addLine(to: CGPoint(x: points[i], y: points[i+1])) }
    context.closePath(); context.setFillColor(color(source.substring(with: match.range(at: 1)))); context.fillPath()
}
let catalog = root.appendingPathComponent("Generated/AppIcons.xcassets"), folder = catalog.appendingPathComponent("AppIcon.appiconset")
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
let destination = CGImageDestinationCreateWithURL(folder.appendingPathComponent("icon.png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, context.makeImage()!, nil); guard CGImageDestinationFinalize(destination) else { fatalError("Icon export failed") }
try Data("{\"info\":{\"author\":\"xcode\",\"version\":1}}".utf8).write(to: catalog.appendingPathComponent("Contents.json"))
let contents = "{\"images\":[{\"filename\":\"icon.png\",\"idiom\":\"universal\",\"platform\":\"ios\",\"size\":\"1024x1024\"}],\"info\":{\"author\":\"xcode\",\"version\":1}}"
try Data(contents.utf8).write(to: folder.appendingPathComponent("Contents.json"))
print("Original Folio icon exported at 1024px")

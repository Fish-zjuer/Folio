import XCTest

final class FolioSmokeTests: XCTestCase {
    @MainActor
    func testOriginalWebScreensAndUIKitInput() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--folio-simulator-qa"]
        app.launch()
        let status = app.staticTexts["folio.qa.status"]
        XCTAssertTrue(status.waitForExistence(timeout: 30), "native host did not launch")
        let prepared = NSPredicate(format: "label BEGINSWITH 'passed|' OR label BEGINSWITH 'failed|'")
        expectation(for: prepared, evaluatedWith: status)
        waitForExpectations(timeout: 120)
        XCTAssertEqual(status.label, "passed|home")
        attach(app, "01-home-full-device")

        let web = app.webViews.firstMatch
        let input = web.textViews.firstMatch
        XCTAssertTrue(input.waitForExistence(timeout: 10))
        input.tap()
        input.typeText("iOS keyboard check")
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
        attach(app, "02-keyboard-full-device")

        let start = web.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.25))
        start.press(forDuration: 0.05, thenDragTo: web.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.25)))
        expectation(for: NSPredicate(format: "label == 'passed|workbench'"), evaluatedWith: status)
        waitForExpectations(timeout: 10)
        attach(app, "03-workbench-after-real-swipe")

        let backStart = web.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.25))
        backStart.press(forDuration: 0.05, thenDragTo: web.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.25)))
        expectation(for: NSPredicate(format: "label == 'passed|home'"), evaluatedWith: status)
        waitForExpectations(timeout: 10)
        let menu = web.buttons["打开功能菜单"]
        XCTAssertTrue(menu.waitForExistence(timeout: 10))
        menu.tap()
        expectation(for: NSPredicate(format: "label == 'passed|menu'"), evaluatedWith: status)
        waitForExpectations(timeout: 10)
        attach(app, "04-menu-real-tap")
    }

    @MainActor
    private func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
